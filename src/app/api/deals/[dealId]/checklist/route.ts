import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("deal_id", dealId)
    .order("sort_order", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  // Get max sort_order for this deal
  const { data: existing } = await supabase
    .from("checklist_items")
    .select("sort_order")
    .eq("deal_id", dealId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      deal_id: dealId,
      task: body.task,
      owner: body.owner || "ran",
      status: "PENDING",
      due_date: body.due_date || null,
      auto_generated: false,
      sort_order: nextOrder,
      notes: body.notes || null,
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
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Checklist item id is required" },
      { status: 400 }
    );
  }

  // If marking as complete, set completed_at
  if (updates.status === "COMPLETE") {
    updates.completed_at = new Date().toISOString();
  }
  // If un-completing, clear completed_at
  if (updates.status && updates.status !== "COMPLETE") {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("checklist_items")
    .update(updates)
    .eq("id", id)
    .eq("deal_id", dealId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Checklist item id is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id)
    .eq("deal_id", dealId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
