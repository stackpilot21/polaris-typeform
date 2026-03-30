import { supabase } from "@/lib/supabase";
import { extractFromTranscript } from "@/lib/claude";
import { generateChecklist } from "@/lib/checklist-engine";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();
  const { call_transcript, internal_notes, form_data } = body;

  if (!call_transcript && !internal_notes && !form_data) {
    return NextResponse.json(
      { error: "Provide at least one source of information" },
      { status: 400 }
    );
  }

  try {
    // 1. Call Claude to extract structured data from all sources
    const extraction = await extractFromTranscript(
      call_transcript || "",
      internal_notes || "",
      form_data || ""
    );

    // 2. Save transcript records
    const transcriptInserts = [];
    if (call_transcript?.trim()) {
      transcriptInserts.push({
        deal_id: dealId,
        source: "manual",
        transcript_type: "call",
        raw_text: call_transcript,
        ai_extraction: extraction,
        processed_at: new Date().toISOString(),
      });
    }
    if (internal_notes?.trim()) {
      transcriptInserts.push({
        deal_id: dealId,
        source: "loom",
        transcript_type: "internal_notes",
        raw_text: internal_notes,
        ai_extraction: extraction,
        processed_at: new Date().toISOString(),
      });
    }

    if (transcriptInserts.length > 0) {
      await supabase.from("transcripts").insert(transcriptInserts);
    }

    // 3. Upsert processing profile
    const profile = extraction.processing_details;
    const merchant = extraction.merchant_profile;
    const pricing = extraction.pricing;

    await supabase.from("processing_profiles").upsert(
      {
        deal_id: dealId,
        industry: merchant.industry,
        business_type: merchant.business_model?.toUpperCase() === "BOTH"
          ? "BOTH"
          : merchant.business_model?.toUpperCase() === "B2C"
          ? "B2C"
          : merchant.business_model?.toUpperCase() === "B2B"
          ? "B2B"
          : null,
        years_in_business: merchant.years_in_business,
        ein_age_months: merchant.ein_age_months,
        website: merchant.website,
        referral_source: merchant.referral_source,
        referral_contact: merchant.referral_contact,
        card_present: profile.card_present,
        card_not_present: profile.card_not_present,
        needs_pos: profile.needs_pos,
        needs_gateway: profile.needs_gateway,
        gateway_preference: profile.gateway_preference,
        needs_ach: profile.needs_ach,
        monthly_volume_estimate: profile.monthly_volume_estimate,
        avg_transaction_size: profile.avg_transaction_size,
        high_ticket_expected: profile.high_ticket_expected,
        high_ticket_initial_limit: profile.high_ticket_initial_limit,
        risk_level: extraction.underwriting_risk.risk_level || "TBD",
        risk_factors: extraction.underwriting_risk.risk_factors?.join("; ") || null,
        processor: null,
        processor_team: null,
        trade_component: pricing.trade_component,
        setup_fee_arrangement: pricing.setup_fee_arrangement,
        strategic_notes: extraction.strategic_notes?.join("\n") || null,
      },
      { onConflict: "deal_id" }
    );

    // 4. Generate and save checklist items
    const checklistItems = generateChecklist(extraction);

    // Clear any existing auto-generated items for this deal
    await supabase
      .from("checklist_items")
      .delete()
      .eq("deal_id", dealId)
      .eq("auto_generated", true);

    if (checklistItems.length > 0) {
      await supabase.from("checklist_items").insert(
        checklistItems.map((item) => ({
          deal_id: dealId,
          task: item.task,
          owner: item.owner,
          status: "PENDING",
          due_date: item.due_date,
          auto_generated: true,
          sort_order: item.sort_order,
          notes: item.notes,
        }))
      );
    }

    // 5. Create rate comparison if competitor info exists
    if (pricing.competitor_name) {
      // Remove existing comparisons for this competitor
      await supabase
        .from("rate_comparisons")
        .delete()
        .eq("deal_id", dealId)
        .eq("competitor_name", pricing.competitor_name);

      await supabase.from("rate_comparisons").insert({
        deal_id: dealId,
        competitor_name: pricing.competitor_name,
        competitor_setup_fee: pricing.competitor_setup_fee,
        competitor_monthly_fee: pricing.competitor_monthly_fee,
        competitor_qualified_rate: pricing.competitor_qualified_rate,
        competitor_non_qual_rate: pricing.competitor_non_qual_rate,
        our_setup_fee: null,
        our_proposed_rate: null,
        trade_component: pricing.trade_component,
        notes: pricing.our_pricing_approach,
      });
    }

    // 6. Update deal with merchant name if we got one and deal has a placeholder
    if (extraction.merchant_profile.business_name) {
      const { data: deal } = await supabase
        .from("deals")
        .select("merchant_name")
        .eq("id", dealId)
        .single();

      if (
        deal &&
        (deal.merchant_name === "New Merchant" ||
          deal.merchant_name === "TBD" ||
          !deal.merchant_name)
      ) {
        await supabase
          .from("deals")
          .update({ merchant_name: extraction.merchant_profile.business_name })
          .eq("id", dealId);
      }
    }

    // 7. Update deal contact info if available
    const contact = extraction.contact_info;
    if (contact.contact_name || contact.contact_email || contact.contact_phone) {
      const updates: Record<string, string> = {};
      if (contact.contact_name) updates.contact_name = contact.contact_name;
      if (contact.contact_email) updates.contact_email = contact.contact_email;
      if (contact.contact_phone) updates.contact_phone = contact.contact_phone;
      if (Object.keys(updates).length > 0) {
        await supabase.from("deals").update(updates).eq("id", dealId);
      }
    }

    return NextResponse.json({
      extraction,
      checklist_count: checklistItems.length,
      message: "Transcript processed successfully",
    });
  } catch (error) {
    console.error("Transcript processing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process transcript",
      },
      { status: 500 }
    );
  }
}
