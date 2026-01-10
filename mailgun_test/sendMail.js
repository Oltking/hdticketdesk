import FormData from "form-data";
import Mailgun from "mailgun.js";
import dotenv from "dotenv";

dotenv.config();

async function sendSimpleMessage() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY, // Ensure this starts with 'key-'
    url: "https://api.eu.mailgun.net" // Uncomment if using an EU account
  });

  const DOMAIN = "mg.hdticketdesk.com";

  try {
    const response = await mg.messages.create(DOMAIN, {
      from: `Mailgun Sandbox <noreply@${DOMAIN}>`,
      to: ["oltking01@gmail.com"], // MUST be verified in the dashboard
      subject: "Hello Olamide Oladiji",
      text: "Testing Mailgun in 2026!",
    });

    console.log("Success:", response);
  } catch (error) {
    console.error("Error Detail:", error.status, error.message);
  }
}
sendSimpleMessage();