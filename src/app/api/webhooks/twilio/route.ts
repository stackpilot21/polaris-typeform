import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;
  const body = formData.get("Body") as string;
  const messageSid = formData.get("MessageSid") as string;

  // Look up deal by matching From number against deals.contact_phone or principals.phone
  let dealId: string | null = null;

  const { data: dealMatch } = await supabase
    .from("deals")
    .select("id")
    .eq("contact_phone", from)
    .limit(1)
    .single();

  if (dealMatch) {
    dealId = dealMatch.id;
  } else {
    const { data: principalMatch } = await supabase
      .from("principals")
      .select("deal_id")
      .eq("phone", from)
      .limit(1)
      .single();

    if (principalMatch) {
      dealId = principalMatch.deal_id;
    }
  }

  await supabase.from("messages").insert({
    deal_id: dealId,
    direction: "INBOUND",
    channel: "SMS",
    from_number: from,
    to_number: to,
    body,
    external_id: messageSid,
    read: false,
  });

  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
