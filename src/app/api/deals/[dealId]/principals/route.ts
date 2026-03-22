import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("principals")
    .insert({
      deal_id: dealId,
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
