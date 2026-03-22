import { NextResponse } from "next/server";
import { createDelegationToken } from "@/lib/tokens";
import { sendSMS } from "@/lib/twilio";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const principalId = body.principal_id;

  // Get principal + deal info
  const { data: principal } = await supabase
    .from("principals")
    .select("*, deals(*)")
    .eq("id", principalId)
    .single();

  if (!principal || !principal.phone) {
    return NextResponse.json(
      { error: "Principal not found or no phone" },
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
    await sendSMS(principal.phone, customMessage);
  } catch (err) {
    console.error("SMS failed:", err);
    return NextResponse.json({ error: "SMS failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
