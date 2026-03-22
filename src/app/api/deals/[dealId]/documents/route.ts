import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const body = await request.json();

  const { error } = await supabase
    .from("documents")
    .update({ status: body.status })
    .eq("id", body.document_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
