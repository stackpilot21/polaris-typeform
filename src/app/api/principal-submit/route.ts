import { supabase } from "@/lib/supabase";
import { encrypt } from "@/lib/encryption";
import { markTokenUsed, validateToken } from "@/lib/tokens";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  const tokenId = formData.get("token_id") as string;
  const principalId = formData.get("principal_id") as string;

  // Validate token
  const tokenData = await validateToken(token);
  if (!tokenData || tokenData.id !== tokenId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Encrypt SSN
  const ssn = formData.get("ssn") as string;
  const { ciphertext, iv, tag } = encrypt(ssn);

  // Upload driver's license if provided
  let driversLicensePath: string | null = null;
  const dlFile = formData.get("drivers_license") as File | null;
  if (dlFile && dlFile.size > 0) {
    const storagePath = `principals/${principalId}/drivers-license-${dlFile.name}`;
    await supabase.storage
      .from("documents")
      .upload(storagePath, dlFile, { upsert: true });
    driversLicensePath = storagePath;
  }

  // Update principal record
  const { error } = await supabase
    .from("principals")
    .update({
      ssn_encrypted: ciphertext,
      ssn_iv: iv,
      ssn_tag: tag,
      dob: formData.get("dob"),
      address_line1: formData.get("address_line1"),
      address_line2: formData.get("address_line2") || null,
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
      drivers_license_path: driversLicensePath,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", principalId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark token used
  await markTokenUsed(tokenId);

  // Update PRINCIPAL_INFO document status if exists
  await supabase
    .from("documents")
    .update({ status: "SUBMITTED" })
    .eq("deal_id", tokenData.principals.deal_id)
    .eq("type", "PRINCIPAL_INFO")
    .eq("status", "MISSING");

  // Auto-update deal status if all documents are no longer MISSING
  const dealId = tokenData.principals.deal_id;
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
