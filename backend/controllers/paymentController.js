import crypto from "crypto";
import axios from "axios";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import MembershipTier from "../models/MembershipTier.js";

const API_VERSION = "2025-01-01";

const cashfreeBaseUrl =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const cashfreeHeaders = () => ({
  "x-client-id": process.env.CASHFREE_APP_ID,
  "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  "x-api-version": API_VERSION,
  Accept: "application/json",
  "Content-Type": "application/json"
});

const activatePaidMembership = async (payment) => {
  const tier = await MembershipTier.findById(payment.tierId);
  const user = await User.findById(payment.userId);

  if (!tier || !user) return;

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + tier.duration);

  user.membershipTier = tier._id;
  user.membershipStatus = "active";
  user.membershipStart = startDate;
  user.membershipEnd = endDate;

  await user.save();
};

export const createCashfreeOrder = async (req, res) => {
  try {
    const { tierId } = req.body;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: "Membership tier is required."
      });
    }

    const tier = await MembershipTier.findOne({
      _id: tierId,
      isActive: true
    });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: "Membership plan not found."
      });
    }

    if (Number(tier.price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "This membership plan is free."
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Cashfree API credentials are not configured."
      });
    }

    const orderId = `TB_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const customerPhone = String(user.phone || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";

    const payload = {
      order_id: orderId,
      order_amount: Number(tier.price),
      order_currency: "INR",
      customer_details: {
        customer_id: user._id.toString(),
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/membership?payment=return&order_id={order_id}`,
        notify_url: `${process.env.BACKEND_URL}/api/webhooks/cashfree`
      },
      order_note: `${tier.name} membership - TechBoard Job Portal`
    };

    const response = await axios.post(
      `${cashfreeBaseUrl}/orders`,
      payload,
      { headers: cashfreeHeaders() }
    );

    await Payment.create({
      userId: user._id,
      tierId: tier._id,
      orderId,
      amount: Number(tier.price),
      currency: "INR",
      status: "PENDING"
    });

    return res.status(200).json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id
    });
  } catch (error) {
    console.error(
      "CASHFREE CREATE ORDER ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Unable to create Cashfree payment order."
    });
  }
};

export const getCashfreePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({
      orderId,
      userId: req.user._id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found."
      });
    }

    // Ask Cashfree for the latest transaction status after redirect.
    const response = await axios.get(
      `${cashfreeBaseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
      { headers: cashfreeHeaders() }
    );

    const transactions = Array.isArray(response.data)
      ? response.data
      : [];

    const successfulPayment = transactions.find(
      (item) => item.payment_status === "SUCCESS"
    );

    const pendingPayment = transactions.find(
      (item) => item.payment_status === "PENDING"
    );

    let status = "FAILED";

    if (successfulPayment) status = "SUCCESS";
    else if (pendingPayment) status = "PENDING";

    if (status === "SUCCESS" && payment.status !== "SUCCESS") {
      payment.status = "SUCCESS";
      payment.paymentId = successfulPayment.cf_payment_id?.toString() || null;
      payment.paymentMethod = successfulPayment.payment_group || null;
      payment.paidAt = new Date();
      await payment.save();
      await activatePaidMembership(payment);
    } else if (status === "FAILED" && payment.status === "PENDING") {
      payment.status = "FAILED";
      await payment.save();
    }

    const tier = await MembershipTier.findById(payment.tierId);

    return res.status(200).json({
      success: true,
      status: payment.status,
      orderId: payment.orderId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod || "Cashfree",
      tierName: tier?.name || "Premium Membership",
      duration: tier?.duration || 0
    });
  } catch (error) {
    console.error(
      "CASHFREE STATUS ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment status."
    });
  }
};

export const cashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = req.rawBody;

    if (!signature || !timestamp || !rawBody) {
      return res.status(400).send("Invalid webhook request.");
    }

    const signedPayload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
      .update(signedPayload)
      .digest("base64");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return res.status(401).send("Invalid webhook signature.");
    }

    const orderId = req.body?.data?.order?.order_id;
    const paymentData = req.body?.data?.payment;
    const paymentStatus = paymentData?.payment_status;

    if (!orderId) {
      return res.status(400).send("Order ID missing.");
    }

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).send("Payment not found.");
    }

    // Webhooks can be delivered more than once.
    if (payment.status === "SUCCESS") {
      return res.status(200).send("Already processed.");
    }

    if (paymentStatus === "SUCCESS") {
      payment.status = "SUCCESS";
      payment.paymentId = paymentData?.cf_payment_id?.toString() || null;
      payment.paymentMethod = paymentData?.payment_group || null;
      payment.paidAt = new Date();
      await payment.save();

      await activatePaidMembership(payment);
    } else if (
      ["FAILED", "USER_DROPPED", "CANCELLED"].includes(paymentStatus)
    ) {
      payment.status = "FAILED";
      payment.paymentId = paymentData?.cf_payment_id?.toString() || null;
      payment.paymentMethod = paymentData?.payment_group || null;
      await payment.save();
    }

    return res.status(200).send("Webhook processed.");
  } catch (error) {
    console.error("CASHFREE WEBHOOK ERROR:", error);
    return res.status(400).send("Webhook processing failed.");
  }
};
