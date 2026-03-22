import { Resend } from "resend";

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "placeholder") {
    throw new Error("Resend API key not configured");
  }
  return new Resend(key);
}

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
    to,
    subject,
    html,
  });

  if (error) throw error;
  return data?.id;
}
