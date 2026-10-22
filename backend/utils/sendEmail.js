import nodemailer from "nodemailer";


const sendEmail = async ({ email, subject, message }) => {
  const apiKey = process.env.EMAIL59_API_KEY;

  if (!apiKey) {
    throw new Error("EMAIL59_API_KEY is missing");
  }

  if (!email) {
    throw new Error("Recipient email is required");
  }

  try {
    const response = await fetch("https://email59.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "techboard",
        to: email,
        subject,
        html: message,
        category: "transactional",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("EMAIL59 API ERROR:", {
        status: response.status,
        error: result,
      });

      throw new Error(
        result?.detail?.error ||
        result?.detail ||
        result?.error ||
        "Email sending failed"
      );
    }

    console.log("EMAIL59 EMAIL RESULT:", {
      id: result.id,
      status: result.status,
      recipient: email,
    });

    return result;
  } catch (error) {
    console.error("EMAIL59 ERROR:", error.message);
    throw error;
  }
};

export default sendEmail;



