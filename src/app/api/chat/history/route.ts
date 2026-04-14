import { supabase } from "@/lib/supabase";

// GET — list recent conversations or load one by id
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(data);
  }

  const { data, error } = await supabase
    .from("chat_history")
    .select("id, title, deal_ids, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) return Response.json([], { status: 500 });
  return Response.json(data || []);
}

// POST — create a new conversation
export async function POST(request: Request) {
  const body = await request.json();
  const { messages, deal_ids, title } = body;

  const { data, error } = await supabase
    .from("chat_history")
    .insert({
      messages: messages || [],
      deal_ids: deal_ids || [],
      title: title || "New conversation",
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "Failed to create" }, { status: 500 });
  }
  return Response.json(data);
}

// PATCH — update an existing conversation
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, messages, deal_ids, title } = body;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (messages !== undefined) updates.messages = messages;
  if (deal_ids !== undefined) updates.deal_ids = deal_ids;
  if (title !== undefined) updates.title = title;

  const { error } = await supabase
    .from("chat_history")
    .update(updates)
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

// DELETE — remove a conversation
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await supabase.from("chat_history").delete().eq("id", id);
  return Response.json({ ok: true });
}
