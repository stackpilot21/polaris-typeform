import { supabase } from "@/lib/supabase";
import { encrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string; principalId: string }> }
) {
  const { principalId } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};

  // Handle SSN encryption
  if (body.ssn) {
    const { ciphertext, iv, tag } = encrypt(body.ssn);
    update.ssn_encrypted = ciphertext;
    update.ssn_iv = iv;
    update.ssn_tag = tag;
  }

  if (body.dob !== undefined) update.dob = body.dob || null;
  if (body.address_line1 !== undefined) update.address_line1 = body.address_line1 || null;
  if (body.address_line2 !== undefined) update.address_line2 = body.address_line2 || null;
  if (body.city !== undefined) update.city = body.city || null;
  if (body.state !== undefined) update.state = body.state || null;
  if (body.zip !== undefined) update.zip = body.zip || null;

  const { error } = await supabase
    .from("principals")
    .update(update)
    .eq("id", principalId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ dealId: string; principalId: string }> }
) {
  const { principalId } = await params;

  const { error } = await supabase
    .from("principals")
    .delete()
    .eq("id", principalId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
