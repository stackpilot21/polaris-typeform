import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { from, to, subject, text } = payload;

  const senderEmail = typeof from === "string" ? from : from?.email || from?.[0]?.email || "";

  // Look up deal by matching sender email against deals.contact_email or principals.email
  let dealId: string | null = null;

  const { data: dealMatch } = await supabase
    .from("deals")
    .select("id")
    .eq("contact_email", senderEmail)
    .limit(1)
    .single();

  if (dealMatch) {
    dealId = dealMatch.id;
  } else {
    const { data: principalMatch } = await supabase
      .from("principals")
      .select("deal_id")
      .eq("email", senderEmail)
      .limit(1)
      .single();

    if (principalMatch) {
      dealId = principalMatch.deal_id;
    }
  }

  const toEmail = typeof to === "string" ? to : Array.isArray(to) ? to[0] : "";

  await supabase.from("messages").insert({
    deal_id: dealId,
    direction: "INBOUND",
    channel: "EMAIL",
    from_email: senderEmail,
    to_email: toEmail,
    subject: subject || null,
    body: text || payload.html || "",
    read: false,
  });

  return NextResponse.json({ ok: true });
}
