import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const { data, error } = await supabase
    .from("processing_profiles")
    .select("*")
    .eq("deal_id", dealId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No profile found
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("processing_profiles")
    .update(body)
    .eq("deal_id", dealId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
