import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import "./Membership.css";

export default function Membership() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* =====================================================
     STATE
  ===================================================== */

  const [tiers, setTiers] = useState([]);
  const [membership, setMembership] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cashfreeResult, setCashfreeResult] = useState(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("card");

  const [upiId, setUpiId] = useState("");

  const [error, setError] = useState("");

  /* =====================================================
     LOAD MEMBERSHIP PLANS
  ===================================================== */

  const loadTiers = async () => {
    try {
      const response = await API.get("/membership/tiers");

      setTiers(response.data || []);
    } catch (error) {
      console.error(
        "LOAD MEMBERSHIP TIERS ERROR:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load membership plans."
      );
    }
  };

  /* =====================================================
     LOAD CURRENT MEMBERSHIP
  ===================================================== */

  const loadMembership = async () => {
    try {
      const response = await API.get("/membership/my");

      setMembership(response.data || null);
    } catch (error) {
      console.error(
        "LOAD MEMBERSHIP ERROR:",
        error
      );

      if (error.response?.status !== 401) {
        console.error(
          error.response?.data?.message ||
            "Failed to load membership."
        );
      }
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        loadTiers(),
        loadMembership()
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  /* =====================================================
     AUTOMATIC EXPIRY REFRESH
     ===================================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      loadMembership();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /* =====================================================
     CASHFREE RETURN / PAYMENT STATUS
  ===================================================== */

  useEffect(() => {
    const payment = searchParams.get("payment");
    const orderId = searchParams.get("order_id");

    if (payment !== "return" || !orderId) {
      return;
    }

    const verifyPayment = async () => {
      try {
        setProcessingPayment(true);

        const response = await API.get(
          `/payments/status/${encodeURIComponent(orderId)}`
        );

        if (response.data?.status === "SUCCESS") {
          await loadMembership();
          setCashfreeResult({
            type: "success",
            tierName: response.data?.tierName || "Premium Membership",
            amount: response.data?.amount || 0,
            paymentMethod: response.data?.paymentMethod || "Cashfree",
            duration: response.data?.duration || 0,
            orderId: response.data?.orderId || orderId
          });
        } else if (response.data?.status === "PENDING") {
          setCashfreeResult({
            type: "pending",
            message: "Your payment is still being processed. Please check again in a moment.",
            orderId
          });
        } else {
          setCashfreeResult({
            type: "failed",
            message: "Payment was not successful. Please try again.",
            orderId
          });
        }
      } catch (error) {
        console.error("CASHFREE PAYMENT VERIFY ERROR:", error);
        setCashfreeResult({
          type: "failed",
          message:
            error.response?.data?.message ||
            "Unable to verify payment.",
          orderId
        });
      } finally {
        setProcessingPayment(false);
        navigate("/membership", { replace: true });
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  /* =====================================================
     CHECK CURRENT PLAN
  ===================================================== */

  const isCurrentPlan = (tierId) => {
    if (membership?.membershipTier?._id !== tierId) {
      return false;
    }

    // An expired paid plan is no longer the current plan.
    if (membership?.membershipStatus === "expired") {
      return false;
    }

    if (
      membership?.membershipStatus === "active" &&
      membership?.membershipEnd &&
      new Date(membership.membershipEnd) <= new Date()
    ) {
      return false;
    }

    return true;
  };

  const hasActivePaidMembership =
    membership?.membershipStatus === "active" &&
    Number(membership?.membershipTier?.price) > 0;

  /* =====================================================
     ACTIVATE MEMBERSHIP
  ===================================================== */

  const handleActivate = async (tier) => {
    try {
      setError("");

      /* -------------------------------------------------
         FREE PLAN
      ------------------------------------------------- */

      if (Number(tier.price) === 0) {
        const response = await API.post(
          "/membership/activate",
          {
            tierId: tier._id
          }
        );

        await loadMembership();

        setCashfreeResult({
          type: "success",
          tierName: tier.name,
          amount: 0,
          paymentMethod: "Free",
          duration: tier.duration
        });

        return;
      }

      /* -------------------------------------------------
         PAID PLAN
         CREATE CASHFREE ORDER + OPEN CHECKOUT
      ------------------------------------------------- */

      if (!window.Cashfree) {
        throw new Error(
          "Cashfree SDK is not loaded. Please refresh the page."
        );
      }

      setProcessingPayment(true);

      const response = await API.post(
        "/payments/create-order",
        { tierId: tier._id }
      );

      if (!response.data?.success || !response.data?.paymentSessionId) {
        throw new Error(
          response.data?.message ||
            "Unable to create Cashfree payment order."
        );
      }

      const cashfree = window.Cashfree({
        mode: "sandbox"
      });

      await cashfree.checkout({
        paymentSessionId: response.data.paymentSessionId,
        redirectTarget: "_self"
      });

    } catch (error) {
      console.error(
        "ACTIVATE MEMBERSHIP ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Unable to activate membership."
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  /* =====================================================
     DEMO PAYMENT
  ===================================================== */

  const handleDemoPayment = async () => {
    if (!selectedTier) {
      return;
    }

    /* -------------------------------------------------
       UPI VALIDATION
    ------------------------------------------------- */

    if (
      selectedPaymentMethod === "upi" &&
      !upiId.trim()
    ) {
      alert("Please enter your UPI ID.");
      return;
    }

    try {
      setProcessingPayment(true);

      setError("");

      /* -------------------------------------------------
         DEMO PROCESSING DELAY
      ------------------------------------------------- */

      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });

      /* -------------------------------------------------
         DEMO PAYMENT API
      ------------------------------------------------- */

      const response = await API.post(
        "/membership/demo-payment",
        {
          tierId: selectedTier._id,

          paymentMethod:
            selectedPaymentMethod,

          upiId:
            selectedPaymentMethod === "upi"
              ? upiId.trim()
              : ""
        }
      );

      /* -------------------------------------------------
         SUCCESS
      ------------------------------------------------- */

      if (response.data?.success) {
        setPaymentSuccess(true);

        await loadMembership();
      } else {
        throw new Error(
          "Demo payment was not successful."
        );
      }

    } catch (error) {
      console.error(
        "DEMO PAYMENT ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Demo payment failed."
      );

    } finally {
      setProcessingPayment(false);
    }
  };

  /* =====================================================
     CLOSE PAYMENT MODAL
  ===================================================== */

  const closePayment = () => {
    if (processingPayment) {
      return;
    }

    setShowPayment(false);

    setSelectedTier(null);

    setPaymentSuccess(false);

    setSelectedPaymentMethod("card");

    setUpiId("");
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="membership-page">

        <div className="membership-loading">

          <div className="membership-spinner"></div>

          <p>
            Loading membership plans...
          </p>

        </div>

      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="membership-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="membership-header">

        <div className="membership-crown">
          👑
        </div>

        <h1>
          Upgrade Your Membership
        </h1>

        <p>
          Get access to premium features,
          exclusive benefits, and more.
        </p>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="membership-error">
          {error}
        </div>
      )}

      {/* =================================================
          CURRENT MEMBERSHIP
      ================================================= */}

      {membership?.membershipTier && (
        <div className="current-membership-card">

          <div className="current-membership-header">

            <div>

              <span className="current-label">
                Current Membership
              </span>

              <h2>
                {membership.membershipTier.name}
              </h2>

            </div>

            <span
              className={`membership-status ${
                membership.membershipStatus
              }`}
            >
              {membership.membershipStatus ===
              "active"
                ? "Active"
                : membership.membershipStatus ===
                  "expired"
                ? "Expired"
                : "Free"}
            </span>

          </div>

          <div className="current-membership-details">

            <div>

              <span>
                Start Date
              </span>

              <strong>
                {formatDate(
                  membership.membershipStart
                )}
              </strong>

            </div>

            <div>

              <span>
                End Date
              </span>

              <strong>
                {formatDate(
                  membership.membershipEnd
                )}
              </strong>

            </div>

            <div>

              <span>
                Status
              </span>

              <strong>
                {membership.membershipStatus}
              </strong>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          PLANS
      ================================================= */}

      <div className="membership-plans">

        {tiers.length === 0 ? (

          <div className="no-membership">

            <h3>
              No membership plans available.
            </h3>

            <p>
              Please try again later.
            </p>

          </div>

        ) : (

          tiers.map((tier, index) => {

            const current =
              isCurrentPlan(tier._id);

            const paid =
              Number(tier.price) > 0;

            const freePlanDisabled =
              !paid && hasActivePaidMembership;

            return (

              <div
                className={`membership-card ${
                  current
                    ? "current-plan"
                    : ""
                } ${
                  paid
                    ? "paid-plan"
                    : "free-plan"
                }`}
                key={tier._id}
              >

                {/* -----------------------------------------
                    POPULAR BADGE
                ----------------------------------------- */}

                {index === 1 &&
                  paid && (
                    <div className="popular-badge">
                      Most Popular
                    </div>
                  )}

                {/* -----------------------------------------
                    PLAN ICON
                ----------------------------------------- */}

                <div className="plan-icon">

                  {paid
                    ? "👑"
                    : "🌱"}

                </div>

                {/* -----------------------------------------
                    PLAN NAME
                ----------------------------------------- */}

                <h2>
                  {tier.name}
                </h2>

                {/* -----------------------------------------
                    PRICE
                ----------------------------------------- */}

                <div className="plan-price">

                  <span className="currency">
                    ₹
                  </span>

                  <span className="amount">
                    {tier.price}
                  </span>

                  <span className="duration">
                    / {tier.duration} days
                  </span>

                </div>

                {/* -----------------------------------------
                    DESCRIPTION
                ----------------------------------------- */}

                {tier.description && (
                  <p className="plan-description">
                    {tier.description}
                  </p>
                )}

                {/* -----------------------------------------
                    FEATURES
                ----------------------------------------- */}

                <div className="plan-features">

                  <div className="feature-item">

                    <span className="feature-check">
                      ✓
                    </span>

                    <span>
                      {tier.jobLimit} job applications
                    </span>

                  </div>

                  <div className="feature-item">

                    <span className="feature-check">
                      ✓
                    </span>

                    <span>
                      {tier.featuredJobs} featured jobs
                    </span>

                  </div>

                  <div className="feature-item">

                    <span className="feature-check">
                      ✓
                    </span>

                    <span>
                      Job search & matching
                    </span>

                  </div>

                  <div className="feature-item">

                    <span className="feature-check">
                      ✓
                    </span>

                    <span>
                      Career assistance
                    </span>

                  </div>

                  <div className="feature-item">

                    <span className="feature-check">
                      ✓
                    </span>

                    <span>
                      AI career assistant
                    </span>

                  </div>

                </div>

                {/* -----------------------------------------
                    BUTTON
                ----------------------------------------- */}

                {current ? (

                  <button
                    className="membership-btn current-btn"
                    disabled
                  >
                    Current Plan ✓
                  </button>

                ) : (

                  <button
                    className={`membership-btn ${
                      paid
                        ? "upgrade-btn"
                        : "free-btn"
                    } ${
                      freePlanDisabled
                        ? "disabled-free-btn"
                        : ""
                    }`}
                    disabled={freePlanDisabled}
                    onClick={() =>
                      handleActivate(tier)
                    }
                  >
                    {freePlanDisabled
                      ? "Free Plan Disabled 🔒"
                      : paid
                      ? `Upgrade to ${tier.name}`
                      : "Get Started"}
                  </button>

                )}

              </div>

            );
          })

        )}

      </div>

      {/* =================================================
          DEMO PAYMENT MODAL
      ================================================= */}

      {/* =================================================
          CASHFREE PAYMENT RESULT
      ================================================= */}

      {cashfreeResult && (
        <div className="cashfree-result-overlay">
          <div className="cashfree-result-modal">
            {cashfreeResult.type === "success" && (
              <>
                <div className="cashfree-result-icon success">✓</div>
                <h2>Payment Successful!</h2>
                <p className="cashfree-result-subtitle">
                  Your membership has been activated successfully.
                </p>

                <div className="cashfree-result-details">
                  <div><span>Membership</span><strong>{cashfreeResult.tierName}</strong></div>
                  <div><span>Amount Paid</span><strong>₹{cashfreeResult.amount}</strong></div>
                  <div><span>Payment</span><strong>{cashfreeResult.paymentMethod}</strong></div>
                  <div><span>Duration</span><strong>{cashfreeResult.duration} Days</strong></div>
                </div>

                <div className="cashfree-result-message">
                  🎉 Welcome to Premium Membership!
                </div>

                <button
                  className="cashfree-result-btn"
                  onClick={() => setCashfreeResult(null)}
                >
                  Continue to Membership
                </button>
              </>
            )}

            {cashfreeResult.type === "pending" && (
              <>
                <div className="cashfree-result-icon pending">⏳</div>
                <h2>Payment Processing</h2>
                <p className="cashfree-result-subtitle">
                  {cashfreeResult.message}
                </p>
                <button
                  className="cashfree-result-btn pending-btn"
                  onClick={() => setCashfreeResult(null)}
                >
                  Continue
                </button>
              </>
            )}

            {cashfreeResult.type === "failed" && (
              <>
                <div className="cashfree-result-icon failed">✕</div>
                <h2>Payment Failed</h2>
                <p className="cashfree-result-subtitle">
                  {cashfreeResult.message}
                </p>
                <button
                  className="cashfree-result-btn failed-btn"
                  onClick={() => setCashfreeResult(null)}
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showPayment &&
        selectedTier && (

          <div className="demo-payment-overlay">

            <div className="demo-payment-modal">

              {/* -----------------------------------------
                  CLOSE BUTTON
              ----------------------------------------- */}

              {!processingPayment &&
                !paymentSuccess && (

                  <button
                    className="demo-close-btn"
                    onClick={closePayment}
                  >
                    ×
                  </button>

                )}

              {/* =========================================
                  PAYMENT SCREEN
              ========================================= */}

              {!processingPayment &&
                !paymentSuccess && (

                  <>

                    <div className="demo-payment-icon">
                      💳
                    </div>

                    <h2>
                      Complete Your Payment
                    </h2>

                    <p className="demo-payment-note">

                      This is a demo payment.

                      <br />

                      <strong>
                        No real money will be charged.
                      </strong>

                    </p>

                    {/* PLAN */}

                    <div className="demo-plan-box">

                      <div>

                        <span className="demo-plan-label">
                          Selected Plan
                        </span>

                        <h3>
                          {selectedTier.name}
                        </h3>

                      </div>

                      <div className="demo-price">

                        ₹{selectedTier.price}

                      </div>

                    </div>

                    {/* =====================================
                        PAYMENT METHODS
                    ===================================== */}

                    <div className="demo-payment-method">

                      <h4>
                        Payment Method
                      </h4>

                      {/* CARD */}

                      <div
                        className={`demo-method ${
                          selectedPaymentMethod ===
                          "card"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedPaymentMethod(
                            "card"
                          )
                        }
                      >

                        <span className="payment-method-icon">
                          💳
                        </span>

                        <span>
                          Demo Card
                        </span>

                        {selectedPaymentMethod ===
                          "card" && (

                          <span className="method-check">
                            ✓
                          </span>

                        )}

                      </div>

                      {/* UPI */}

                      <div
                        className={`demo-method ${
                          selectedPaymentMethod ===
                          "upi"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedPaymentMethod(
                            "upi"
                          )
                        }
                      >

                        <span className="payment-method-icon">
                          📱
                        </span>

                        <span>
                          UPI (Demo)
                        </span>

                        {selectedPaymentMethod ===
                          "upi" && (

                          <span className="method-check">
                            ✓
                          </span>

                        )}

                      </div>

                      {/* WALLET */}

                      <div
                        className={`demo-method ${
                          selectedPaymentMethod ===
                          "wallet"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedPaymentMethod(
                            "wallet"
                          )
                        }
                      >

                        <span className="payment-method-icon">
                          👛
                        </span>

                        <span>
                          Wallet (Demo)
                        </span>

                        {selectedPaymentMethod ===
                          "wallet" && (

                          <span className="method-check">
                            ✓
                          </span>

                        )}

                      </div>

                    </div>

                    {/* =====================================
                        UPI PAYMENT
                    ===================================== */}

                    {selectedPaymentMethod ===
                      "upi" && (

                      <div className="upi-payment-box">

                        <label htmlFor="upiId">
                          Enter UPI ID
                        </label>

                        <input
                          id="upiId"
                          type="text"
                          placeholder="example@upi"
                          value={upiId}
                          onChange={(e) =>
                            setUpiId(
                              e.target.value
                            )
                          }
                        />

                        <div className="demo-qr-box">

                          <div className="fake-qr">
                            <span>
                              ▦
                            </span>
                          </div>

                          <div>

                            <strong>
                              Scan & Pay
                            </strong>

                            <p>
                              This is a demo UPI
                              payment.
                            </p>

                          </div>

                        </div>

                      </div>

                    )}

                    {/* =====================================
                        WALLET PAYMENT
                    ===================================== */}

                    {selectedPaymentMethod ===
                      "wallet" && (

                      <div className="wallet-payment-box">

                        <div className="wallet-icon">
                          👛
                        </div>

                        <div>

                          <strong>
                            Demo Wallet
                          </strong>

                          <p>
                            Demo wallet payment will
                            be processed without real
                            money.
                          </p>

                        </div>

                      </div>

                    )}

                    {/* =====================================
                        PAY BUTTON
                    ===================================== */}

                    <button
                      className="demo-pay-btn"
                      onClick={
                        handleDemoPayment
                      }
                    >

                      {selectedPaymentMethod ===
                      "upi"

                        ? `Pay ₹${selectedTier.price} with UPI`

                        : selectedPaymentMethod ===
                          "wallet"

                        ? `Pay ₹${selectedTier.price} with Wallet`

                        : `Pay ₹${selectedTier.price} with Card`}

                    </button>

                    <p className="demo-secure-text">

                      🔒 Demo transaction

                      <br />

                      No real payment will be made.

                    </p>

                  </>

                )}

              {/* =========================================
                  PROCESSING
              ========================================= */}

              {processingPayment && (

                <div className="demo-processing">

                  <div className="demo-spinner"></div>

                  <h2>
                    Processing Payment...
                  </h2>

                  <p>
                    Please wait while we
                    process your demo payment.
                  </p>

                  <div className="demo-processing-box">

                    ℹ️ This is a demo payment.

                    <br />

                    No real money will be charged.

                  </div>

                </div>

              )}

              {/* =========================================
                  SUCCESS
              ========================================= */}

              {paymentSuccess && (

                <div className="demo-success">

                  <div className="demo-success-icon">
                    ✓
                  </div>

                  <h2>
                    Payment Successful!
                  </h2>

                  <p>
                    Your membership has been
                    activated successfully.
                  </p>

                  <div className="demo-plan-box">

                    <div>

                      <span className="demo-plan-label">
                        Membership
                      </span>

                      <h3>
                        {selectedTier.name}
                      </h3>

                    </div>

                    <div className="demo-price">

                      ₹{selectedTier.price}

                    </div>

                  </div>

                  <div className="success-info">

                    <div>

                      <span>
                        Payment Method
                      </span>

                      <strong>
                        {selectedPaymentMethod ===
                        "upi"
                          ? "UPI"
                          : selectedPaymentMethod ===
                            "wallet"
                          ? "Wallet"
                          : "Card"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Status
                      </span>

                      <strong>
                        Active ✓
                      </strong>

                    </div>

                    <div>

                      <span>
                        Duration
                      </span>

                      <strong>
                        {selectedTier.duration} days
                      </strong>

                    </div>

                  </div>

                  <button
                    className="demo-pay-btn"
                    onClick={closePayment}
                  >
                    Continue to Membership
                  </button>

                </div>

              )}

            </div>

          </div>

        )}

    </div>
  );
}