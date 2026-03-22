import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = { status: body.status };

  // Audit trail for approvals/rejections
  if (body.status === "APPROVED" || body.status === "REJECTED") {
    updateData.reviewed_at = new Date().toISOString();
    if (body.reviewed_by) {
      updateData.reviewed_by = body.reviewed_by;
    }
  }

  const { error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", body.document_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-update deal status: if no documents are MISSING, set to DOCUMENTS_COMPLETE
  const { data: allDocs } = await supabase
    .from("documents")
    .select("status")
    .eq("deal_id", dealId);

  if (allDocs && allDocs.length > 0) {
    const hasMissing = allDocs.some((d) => d.status === "MISSING");
    if (!hasMissing) {
      await supabase
        .from("deals")
        .update({ status: "DOCUMENTS_COMPLETE" })
        .eq("id", dealId)
        .in("status", ["PENDING", "IN_PROGRESS"]);
    }
  }

  return NextResponse.json({ ok: true });
}
