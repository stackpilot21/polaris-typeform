import { NextResponse } from "next/server";
import { createDelegationToken } from "@/lib/tokens";
import { sendSMS } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const principalId = body.principal_id;
  const channel: "sms" | "email" = body.channel || "sms";

  // Get principal + deal info
  const { data: principal } = await supabase
    .from("principals")
    .select("*, deals(*)")
    .eq("id", principalId)
    .single();

  if (!principal) {
    return NextResponse.json(
      { error: "Principal not found" },
      { status: 400 }
    );
  }

  if (channel === "sms" && !principal.phone) {
    return NextResponse.json(
      { error: "Principal has no phone number" },
      { status: 400 }
    );
  }

  if (channel === "email" && !principal.email) {
    return NextResponse.json(
      { error: "Principal has no email address" },
      { status: 400 }
    );
  }

  const token = await createDelegationToken(principalId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/p/${token.token}`;

  const principalFirst = principal.name.split(" ")[0];
  const defaultMessage = `Hi ${principalFirst}, please submit your information for ${principal.deals.merchant_name}: ${link}`;
  const customMessage = body.message
    ? `${body.message}\n\n${link}`
    : defaultMessage;

  try {
    if (channel === "email") {
      const subject = `Submit your information for ${principal.deals.merchant_name}`;
      const html = `<p>${customMessage.replace(/\n/g, "<br>")}</p>`;
      await sendEmail(principal.email, subject, html);
    } else {
      await sendSMS(principal.phone, customMessage);
    }
  } catch (err) {
    console.error(`${channel.toUpperCase()} failed:`, err);
    return NextResponse.json({ error: `${channel.toUpperCase()} failed` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
