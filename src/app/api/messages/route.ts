import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("deal_id");
  const unread = searchParams.get("unread");

  // Return unread count only
  if (unread === "true") {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .eq("direction", "INBOUND");
    return NextResponse.json({ unread_count: count || 0 });
  }

  let query = supabase
    .from("messages")
    .select("*, deals(merchant_name, contact_email, contact_phone)")
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { deal_id, channel, body, to, subject } = await request.json();

  let externalId: string | null = null;

  if (channel === "SMS") {
    try {
      externalId = await sendSMS(to, body) || null;
    } catch (e) {
      console.error("SMS send failed (placeholder credentials?):", e);
    }
  } else if (channel === "EMAIL") {
    try {
      externalId = (await sendEmail(to, subject || "Message from Polaris", body)) || null;
    } catch (e) {
      console.error("Email send failed (placeholder credentials?):", e);
    }
  }

  const insertData: Record<string, unknown> = {
    deal_id,
    direction: "OUTBOUND",
    channel,
    body,
    external_id: externalId,
    read: true,
  };

  if (channel === "SMS") {
    insertData.to_number = to;
    insertData.from_number = process.env.TWILIO_PHONE_NUMBER || null;
  } else {
    insertData.to_email = to;
    insertData.from_email = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
    insertData.subject = subject || "Message from Polaris";
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
