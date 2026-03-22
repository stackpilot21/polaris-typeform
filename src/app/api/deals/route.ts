import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("deals")
    .select("*, documents(status)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      merchant_name: body.merchant_name,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create document records
  const docTypes = ["VOIDED_CHECK", "DRIVERS_LICENSE", "PRINCIPAL_INFO"];
  await supabase.from("documents").insert(
    docTypes.map((type) => ({
      deal_id: deal.id,
      type,
      status: "MISSING",
    }))
  );

  return NextResponse.json(deal, { status: 201 });
}
