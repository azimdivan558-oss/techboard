import nodemailer from "nodemailer";
import axios from "axios";

/**
 * Sends an e-mail.
 *
 * 1) If BREVO_API_KEY is set -> Brevo HTTPS API (works on Render, where
 *    SMTP ports are blocked on free instances).
 * 2) Otherwise -> Gmail SMTP via nodemailer (works locally).
 *
 * Env:
 *   BREVO_API_KEY, MAIL_FROM          (Render)
 *   SMTP_EMAIL / SMTP_PASSWORD        (local; EMAIL_USER / EMAIL_PASSWORD also accepted)
 */
const sendEmail = async ({ email, subject, message }) => {
  const senderEmail =
    process.env.MAIL_FROM ||
    process.env.SMTP_EMAIL ||
    process.env.EMAIL_USER;

  // ---------- Brevo (HTTPS) ----------
  if (process.env.BREVO_API_KEY) {
    if (!senderEmail) {
      throw new Error("MAIL_FROM (or SMTP_EMAIL) is required with BREVO_API_KEY");
    }

    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "TechBoard", email: senderEmail },
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
      return;
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      throw new Error(`Brevo send failed: ${detail}`);
    }
  }

  // ---------- Render par SMTP block hai ----------
  if (process.env.RENDER) {
    throw new Error("BREVO_API_KEY is not set on Render; SMTP is blocked there");
  }

  // ---------- Gmail SMTP (local) ----------
  const user = process.env.SMTP_EMAIL || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("Email is not configured (SMTP_EMAIL / SMTP_PASSWORD missing)");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"TechBoard" <${user}>`,
    to: email,
    subject,
    html: message,
  });
};

export default sendEmail;