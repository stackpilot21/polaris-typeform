import { supabase } from "@/lib/supabase";
import { extractFromDocument } from "@/lib/claude";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const uploadType = (formData.get("type") as string) || "competitor";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "File must be PDF, PNG, JPG, or WebP" },
      { status: 400 }
    );
  }

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Extract rates with Claude vision
    const extraction = await extractFromDocument(
      base64,
      file.type as "image/png" | "image/jpeg" | "image/webp" | "application/pdf"
    );

    const processorName = extraction.processor_name || "Unknown Processor";

    if (uploadType === "ours") {
      // Save as OUR proposed rates — update existing rate comparison or create new
      // Try to find an existing rate comparison for this deal to attach our rates to
      const { data: existing } = await supabase
        .from("rate_comparisons")
        .select("id")
        .eq("deal_id", dealId)
        .limit(1)
        .single();

      if (existing) {
        // Update the existing comparison with our rates
        await supabase
          .from("rate_comparisons")
          .update({
            our_proposed_rate: extraction.rates.qualified_rate,
            our_setup_fee: extraction.rates.setup_fee,
            our_monthly_fee: extraction.rates.monthly_fee,
            our_per_transaction_fee: extraction.rates.per_transaction_fee,
          })
          .eq("id", existing.id);
      } else {
        // No competitor yet — create a row with just our rates
        await supabase.from("rate_comparisons").insert({
          deal_id: dealId,
          competitor_name: "N/A",
          our_proposed_rate: extraction.rates.qualified_rate,
          our_setup_fee: extraction.rates.setup_fee,
          our_monthly_fee: extraction.rates.monthly_fee,
          our_per_transaction_fee: extraction.rates.per_transaction_fee,
          pricing_model: extraction.pricing_model,
          notes: extraction.notes?.join("; ") || null,
        });
      }

      return NextResponse.json({
        extraction,
        message: `Our rates extracted (${processorName})`,
      });
    } else {
      // Save as COMPETITOR rates
      // Remove existing comparison for this processor
      await supabase
        .from("rate_comparisons")
        .delete()
        .eq("deal_id", dealId)
        .eq("competitor_name", processorName);

      await supabase.from("rate_comparisons").insert({
        deal_id: dealId,
        competitor_name: processorName,
        competitor_setup_fee: extraction.rates.setup_fee,
        competitor_monthly_fee: extraction.rates.monthly_fee,
        competitor_qualified_rate: extraction.rates.qualified_rate,
        competitor_mid_qual_rate: extraction.rates.mid_qual_rate,
        competitor_non_qual_rate: extraction.rates.non_qual_rate,
        competitor_per_transaction_fee: extraction.rates.per_transaction_fee,
        pricing_model: extraction.pricing_model,
        notes: extraction.notes?.join("; ") || null,
      });

      return NextResponse.json({
        extraction,
        message: `Competitor rates extracted (${processorName})`,
      });
    }
  } catch (error) {
    console.error("Document extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process document",
      },
      { status: 500 }
    );
  }
}
