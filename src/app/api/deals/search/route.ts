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
    .not("status", "in", '("APPROVED","DECLINED")')
    .order("merchant_name")
    .limit(20);

  if (error) {
    return Response.json([], { status: 500 });
  }

  // Deduplicate by merchant_name (keep first occurrence)
  const seen = new Set<string>();
  const unique = (data || []).filter((d) => {
    const name = d.merchant_name.toLowerCase();
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  return Response.json(unique.slice(0, 8));
}
