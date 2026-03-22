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

  const update: Record<string, unknown> = { status: body.status };

  // When resuming, recalculate next_send_at
  if (body.status === "ACTIVE") {
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
