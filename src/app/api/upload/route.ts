import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const dealId = formData.get("deal_id") as string;
  const docType = formData.get("doc_type") as string;

  if (!file || !dealId || !docType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const storagePath = `${dealId}/${docType}/${file.name}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  // Update document record
  const { error: dbError } = await supabase
    .from("documents")
    .update({
      status: "SUBMITTED",
      storage_path: storagePath,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    })
    .eq("deal_id", dealId)
    .eq("type", docType);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
