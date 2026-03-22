import { supabase } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";
import { NextResponse } from "next/server";
import { DOCUMENT_TYPE_LABELS, DocumentType } from "@/types";

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active sequences due to send
  const { data: sequences } = await supabase
    .from("follow_up_sequences")
    .select("*, deals(*, documents(type, status))")
    .eq("status", "ACTIVE")
    .lte("next_send_at", new Date().toISOString());

  if (!sequences || sequences.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const seq of sequences) {
    const deal = seq.deals;
    const missingDocs = deal.documents.filter(
      (d: { status: string }) => d.status === "MISSING"
    );

    // Auto-complete if no missing docs
    if (missingDocs.length === 0) {
      await supabase
        .from("follow_up_sequences")
        .update({ status: "COMPLETED" })
        .eq("id", seq.id);
      continue;
    }

    const missingList = missingDocs
      .map((d: { type: DocumentType }) => DOCUMENT_TYPE_LABELS[d.type])
      .join(", ");

    const message = `Hi ${deal.contact_name}, we're still waiting on the following documents for ${deal.merchant_name}: ${missingList}. Please submit them at your earliest convenience.`;

    // Send SMS
    try {
      const smsId = await sendSMS(deal.contact_phone, message);
      await supabase.from("follow_up_messages").insert({
        sequence_id: seq.id,
        channel: "SMS",
        content: message,
        external_id: smsId,
      });
    } catch (err) {
      console.error("SMS failed for deal", deal.id, err);
    }

    // Send email
    try {
      const emailId = await sendEmail(
        deal.contact_email,
        `Documents needed for ${deal.merchant_name}`,
        `<p>${message}</p>`
      );
      await supabase.from("follow_up_messages").insert({
        sequence_id: seq.id,
        channel: "EMAIL",
        content: message,
        external_id: emailId,
      });
    } catch (err) {
      console.error("Email failed for deal", deal.id, err);
    }

    // Advance next_send_at
    const nextSendAt = new Date(
      Date.now() + seq.interval_days * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("follow_up_sequences")
      .update({ next_send_at: nextSendAt })
      .eq("id", seq.id);

    processed++;
  }

  return NextResponse.json({ processed });
}
