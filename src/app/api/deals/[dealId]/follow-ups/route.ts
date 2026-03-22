import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();
  const intervalDays = body.interval_days || 2;

  const nextSendAt = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("follow_up_sequences")
    .insert({
      deal_id: dealId,
      interval_days: intervalDays,
      status: "ACTIVE",
      next_send_at: nextSendAt,
      custom_message: body.custom_message || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.custom_message !== undefined) update.custom_message = body.custom_message || null;
  if (body.interval_days) {
    update.interval_days = body.interval_days;
    update.next_send_at = new Date(
      Date.now() + body.interval_days * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // When resuming, recalculate next_send_at
  if (body.status === "ACTIVE" && !body.interval_days) {
    const { data: seq } = await supabase
      .from("follow_up_sequences")
      .select("interval_days")
      .eq("deal_id", dealId)
      .single();

    if (seq) {
      update.next_send_at = new Date(
        Date.now() + seq.interval_days * 24 * 60 * 60 * 1000
      ).toISOString();
    }
  }

  const { error } = await supabase
    .from("follow_up_sequences")
    .update(update)
    .eq("deal_id", dealId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
