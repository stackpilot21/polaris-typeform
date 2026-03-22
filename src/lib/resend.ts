import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
    to,
    subject,
    html,
  });

  if (error) throw error;
  return data?.id;
}
