import { supabase } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
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
      .select("*, follow_up_messages(*)")
      .eq("deal_id", dealId)
      .maybeSingle(),
  ]);

  if (dealRes.error)
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  // Mask SSNs — only return last 4
  const principals = (principalsRes.data || []).map((p: Record<string, unknown>) => {
    if (p.ssn_encrypted && p.ssn_iv && p.ssn_tag) {
      try {
        const ssn = decrypt(p.ssn_encrypted as string, p.ssn_iv as string, p.ssn_tag as string);
        return { ...p, ssn_last4: ssn.slice(-4), ssn_encrypted: "true" };
      } catch {
        return { ...p, ssn_last4: null, ssn_encrypted: "true" };
      }
    }
    return { ...p, ssn_last4: null };
  });

  return NextResponse.json({
    deal: dealRes.data,
    documents: docsRes.data || [],
    principals,
    sequence: seqRes.data,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("deals")
    .update(updateData)
    .eq("id", dealId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
