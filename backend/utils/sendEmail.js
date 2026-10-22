import nodemailer from "nodemailer";

const sendEmail = async ({ email, subject, message }) => {
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "SMTP_EMAIL or SMTP_PASSWORD is missing"
    );
  }

  if (!email) {
    throw new Error("Recipient email is required");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.verify();
    console.log("GMAIL SMTP CONNECTION SUCCESS");

    const info = await transporter.sendMail({
      from: `"TechBoard" <${user}>`,
      to: email,
      subject,
      html: message,
    });

    console.log("GMAIL SMTP EMAIL RESULT:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      recipient: email,
      subject,
    });

    if (!info.accepted?.length || info.rejected?.length) {
      throw new Error("SMTP did not accept the recipient");
    }

    return info;
  } catch (error) {
    console.error("GMAIL SMTP ERROR:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message,
    });

    throw error;
  }
};

export default sendEmail;
