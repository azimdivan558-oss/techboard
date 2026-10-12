import MembershipTier from "../models/MembershipTier.js";
import User from "../models/User.js";
import { expireMembershipForUser } from "../utils/membershipExpiry.js";

/* =========================================================
   GET ALL ACTIVE MEMBERSHIP PLANS
========================================================= */
export const getMembershipTiers = async (req, res) => {
  try {
    const tiers = await MembershipTier.find({
      isActive: true
    }).sort({ price: 1 });

    res.status(200).json(tiers);
  } catch (error) {
    console.error("GET MEMBERSHIP TIERS ERROR:", error);

    res.status(500).json({
      message: "Failed to load membership plans."
    });
  }
};

/* =========================================================
   GET CURRENT USER MEMBERSHIP
========================================================= */
export const getMyMembership = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("membershipTier");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // Automatically downgrade an expired paid membership to Free.
    await expireMembershipForUser(user);

    // Re-populate after a possible automatic downgrade.
    await user.populate("membershipTier");

    res.status(200).json({
      membershipTier: user.membershipTier,
      membershipStatus: user.membershipStatus,
      membershipStart: user.membershipStart,
      membershipEnd: user.membershipEnd
    });
  } catch (error) {
    console.error("GET MY MEMBERSHIP ERROR:", error);

    res.status(500).json({
      message: "Failed to load membership."
    });
  }
};

/* =========================================================
   ACTIVATE FREE MEMBERSHIP
========================================================= */
export const activateMembership = async (req, res) => {
  try {
    const { tierId } = req.body;

    if (!tierId) {
      return res.status(400).json({
        message: "Membership tier is required."
      });
    }

    const tier = await MembershipTier.findOne({
      _id: tierId,
      isActive: true
    });

    if (!tier) {
      return res.status(404).json({
        message: "Membership plan not found."
      });
    }

    // Paid plans must use demo payment
    if (tier.price > 0) {
      return res.status(400).json({
        message: "Please complete demo payment for this plan."
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // Never allow a user to manually downgrade while a paid plan is active.
    await expireMembershipForUser(user);

    if (
      user.membershipStatus === "active" &&
      user.membershipEnd &&
      new Date(user.membershipEnd) > new Date()
    ) {
      const currentTier = await MembershipTier.findById(user.membershipTier);

      if (currentTier && Number(currentTier.price) > 0) {
        return res.status(400).json({
          message: "Your paid membership is still active until " +
            new Date(user.membershipEnd).toLocaleDateString("en-IN") + "."
        });
      }
    }

    const startDate = new Date();

    const endDate = new Date(startDate);
    endDate.setDate(
      endDate.getDate() + tier.duration
    );

    user.membershipTier = tier._id;
    user.membershipStatus = "free";
    user.membershipStart = startDate;
    user.membershipEnd = endDate;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate("membershipTier");

    res.status(200).json({
      message: `${tier.name} membership activated successfully.`,

      membership: {
        membershipTier: updatedUser.membershipTier,
        membershipStatus: updatedUser.membershipStatus,
        membershipStart: updatedUser.membershipStart,
        membershipEnd: updatedUser.membershipEnd
      }
    });
  } catch (error) {
    console.error("ACTIVATE MEMBERSHIP ERROR:", error);

    res.status(500).json({
      message: "Failed to activate membership."
    });
  }
};

/* =========================================================
   DEMO PAYMENT
   NO REAL MONEY IS CHARGED
========================================================= */
export const demoPayment = async (req, res) => {
  try {
    const { tierId } = req.body;

    if (!tierId) {
      return res.status(400).json({
        message: "Membership tier is required."
      });
    }

    // Get plan from database
    const tier = await MembershipTier.findOne({
      _id: tierId,
      isActive: true
    });

    if (!tier) {
      return res.status(404).json({
        message: "Membership plan not found."
      });
    }

    // Demo payment is only required for paid plans
    if (tier.price <= 0) {
      return res.status(400).json({
        message: "This is a free membership plan."
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    /*
      DEMO PAYMENT

      No real payment gateway.
      No money is deducted.
    */

    const startDate = new Date();

    const endDate = new Date(startDate);

    endDate.setDate(
      endDate.getDate() + tier.duration
    );

    // Activate membership
    user.membershipTier = tier._id;
    user.membershipStatus = "active";
    user.membershipStart = startDate;
    user.membershipEnd = endDate;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate("membershipTier");

    console.log(
      "DEMO PAYMENT SUCCESS:",
      user.email,
      tier.name,
      tier.price
    );

    res.status(200).json({
      success: true,

      message:
        "Demo payment successful. Membership activated.",

      payment: {
        mode: "DEMO",
        amount: tier.price,
        status: "success",
        transactionId:
          "DEMO-" + Date.now()
      },

      membership: {
        membershipTier: updatedUser.membershipTier,
        membershipStatus: updatedUser.membershipStatus,
        membershipStart: updatedUser.membershipStart,
        membershipEnd: updatedUser.membershipEnd
      }
    });
  } catch (error) {
    console.error("DEMO PAYMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Demo payment failed."
    });
  }
};