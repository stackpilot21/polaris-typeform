import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const [dealRes, docsRes, principalsRes, seqRes] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).single(),
    supabase.from("documents").select("*").eq("deal_id", dealId),
    supabase.from("principals").select("*").eq("deal_id", dealId),
    supabase
      .from("follow_up_sequences")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle(),
  ]);

  if (dealRes.error)
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  return NextResponse.json({
    deal: dealRes.data,
    documents: docsRes.data || [],
    principals: principalsRes.data || [],
    sequence: seqRes.data,
  });
}
