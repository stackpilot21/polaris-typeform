import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, merchant_name")
    .ilike("merchant_name", `%${q}%`)
    .order("merchant_name")
    .limit(8);

  if (error) {
    return Response.json([], { status: 500 });
  }

  return Response.json(data || []);
}
