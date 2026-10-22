
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

  // Brevo HTTPS API - for Render deployment
  if (process.env.BREVO_API_KEY) {
    if (!senderEmail) {
      throw new Error(
        "MAIL_FROM (or SMTP_EMAIL) is required with BREVO_API_KEY"
      );
    }

    try {
      // FIX: Capture the API response in a variable
      const response = await axios.post(
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

      console.log("BREVO ACCEPTED EMAIL:", {
        messageId: response.data?.messageId,
        subject,
      });

      return response.data;
    } catch (err) {
      const detail =
        err.response?.data?.message ||
        err.response?.data?.code ||
        err.message;

      console.error("BREVO API ERROR:", {
        status: err.response?.status,
        detail,
      });

      throw new Error(`Brevo send failed: ${detail}`);
    }
  }

  // Render: do not fall back to SMTP
  if (process.env.RENDER) {
    throw new Error(
      "BREVO_API_KEY is not set on Render; SMTP is unavailable"
    );
  }

  // Gmail SMTP - for local development
  const user = process.env.SMTP_EMAIL || process.env.EMAIL_USER;
  const pass =
    process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

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

  console.log(
  "BREVO API RESPONSE:",
  JSON.stringify(response.data)
);

console.log("BREVO REQUEST DETAILS:", {
  messageId: response.data?.messageId,
  recipient: email,
  subject,
});

  return info;
};

export default sendEmail;
