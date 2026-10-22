import nodemailer from "nodemailer";
import axios from "axios";

const sendEmail = async ({ email, subject, message }) => {
  console.log("========== EMAIL CONFIG ==========");
  console.log("RENDER:", Boolean(process.env.RENDER));
  console.log(
    "BREVO_API_KEY configured:",
    Boolean(process.env.BREVO_API_KEY)
  );
  console.log("MAIL_FROM configured:", Boolean(process.env.MAIL_FROM));
  console.log(
    "SMTP_EMAIL configured:",
    Boolean(process.env.SMTP_EMAIL || process.env.EMAIL_USER)
  );
  console.log("==================================");

  const senderEmail =
    process.env.MAIL_FROM ||
    process.env.SMTP_EMAIL ||
    process.env.EMAIL_USER;

  // Brevo API for Render deployment
  if (process.env.BREVO_API_KEY) {
    if (!senderEmail) {
      throw new Error(
        "MAIL_FROM (or SMTP_EMAIL) is required with BREVO_API_KEY"
      );
    }

    let response;

    // Step 1: Send email through Brevo
    try {
      response = await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: {
            name: "TechBoard",
            email: senderEmail,
          },
          to: [{ email }],
          subject,
          htmlContent: message,
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
            accept: "application/json",
          },
          timeout: 15000,
        }
      );
    } catch (err) {
      const detail =
        err.response?.data?.message ||
        err.response?.data?.code ||
        err.message;

      console.error("BREVO API ERROR:", {
        status: err.response?.status,
        detail,
        recipient: email,
        subject,
      });

      throw new Error(`Brevo send failed: ${detail}`);
    }

    const messageId = response.data?.messageId;

    console.log("BREVO ACCEPTED EMAIL:", {
      messageId,
      recipient: email,
      sender: senderEmail,
      subject,
    });

    // Step 2: Check Brevo delivery events
    // Tracking failure must not interrupt OTP generation.
    if (messageId) {
      try {
        const tracking = await axios.get(
          "https://api.brevo.com/v3/smtp/statistics/events",
          {
            params: {
              messageId,
              days: 7,
              limit: 20,
            },
            headers: {
              "api-key": process.env.BREVO_API_KEY,
              accept: "application/json",
            },
            timeout: 10000,
          }
        );

        console.log(
          "BREVO DELIVERY EVENTS:",
          JSON.stringify(
            tracking.data?.events ?? tracking.data,
            null,
            2
          )
        );
      } catch (err) {
        console.error("BREVO TRACKING ERROR:", {
          status: err.response?.status,
          detail: err.response?.data || err.message,
          messageId,
        });
      }
    } else {
      console.warn(
        "Brevo response did not contain a messageId."
      );
    }

    return response.data;
  }

  // Do not use SMTP fallback on Render
  if (process.env.RENDER) {
    throw new Error(
      "BREVO_API_KEY is not set on Render; SMTP is unavailable"
    );
  }

  // Gmail SMTP for local development
  const user =
    process.env.SMTP_EMAIL || process.env.EMAIL_USER;

  const pass =
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Email is not configured (SMTP_EMAIL / SMTP_PASSWORD missing)"
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: `"TechBoard" <${user}>`,
    to: email,
    subject,
    html: message,
  });

  console.log("SMTP EMAIL SENT:", {
    messageId: info.messageId,
    recipient: email,
    subject,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  return info;
};

export default sendEmail;