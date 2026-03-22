import crypto from "crypto";
import { supabase } from "./supabase";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createDelegationToken(principalId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const { data, error } = await supabase
    .from("delegation_tokens")
    .insert({
      principal_id: principalId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function validateToken(token: string) {
  const { data, error } = await supabase
    .from("delegation_tokens")
    .select("*, principals(*)")
    .eq("token", token)
    .single();

  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  return data;
}

export async function markTokenUsed(tokenId: string) {
  const { error } = await supabase
    .from("delegation_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) throw error;
}
