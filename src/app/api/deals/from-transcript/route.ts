import { supabase } from "@/lib/supabase";
import { extractFromTranscript } from "@/lib/claude";
import { generateChecklist } from "@/lib/checklist-engine";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { call_transcript, internal_notes, form_data } = body;

  if (!call_transcript && !internal_notes && !form_data) {
    return NextResponse.json(
      { error: "Provide at least one source of information" },
      { status: 400 }
    );
  }

  try {
    // 1. Extract structured data from all sources
    const extraction = await extractFromTranscript(
      call_transcript || "",
      internal_notes || "",
      form_data || ""
    );

    // 2. Create the deal
    const merchantName =
      extraction.merchant_profile.business_name || "New Merchant";
    const contactName =
      extraction.contact_info.contact_name || "TBD";
    const contactEmail =
      extraction.contact_info.contact_email || "tbd@pending.com";
    const contactPhone =
      extraction.contact_info.contact_phone || "TBD";

    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        merchant_name: merchantName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        notes: extraction.strategic_notes?.join("\n") || null,
        status: "PENDING",
      })
      .select()
      .single();

    if (dealError) {
      return NextResponse.json(
        { error: dealError.message },
        { status: 500 }
      );
    }

    const dealId = deal.id;

    // 3. Auto-create standard document records
    const docTypes = ["VOIDED_CHECK", "DRIVERS_LICENSE", "PRINCIPAL_INFO"];
    await supabase.from("documents").insert(
      docTypes.map((type) => ({
        deal_id: dealId,
        type,
        status: "MISSING",
      }))
    );

    // 4. Add bank statement documents based on what's needed
    const docsNeeded = extraction.underwriting_risk.documents_needed || [];
    for (const doc of docsNeeded) {
      const lower = doc.toLowerCase();
      if (lower.includes("bank statement")) {
        await supabase.from("documents").insert({
          deal_id: dealId,
          type: "CUSTOM",
          custom_name: doc,
          status: "MISSING",
        });
      }
    }

    // 5. Save transcript records
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

    // 6. Create processing profile
    const profile = extraction.processing_details;
    const merchant = extraction.merchant_profile;
    const pricing = extraction.pricing;

    await supabase.from("processing_profiles").insert({
      deal_id: dealId,
      industry: merchant.industry,
      business_type:
        merchant.business_model?.toUpperCase() === "BOTH"
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
      risk_factors:
        extraction.underwriting_risk.risk_factors?.join("; ") || null,
      trade_component: pricing.trade_component,
      setup_fee_arrangement: pricing.setup_fee_arrangement,
      strategic_notes: extraction.strategic_notes?.join("\n") || null,
    });

    // 7. Generate and save checklist
    const checklistItems = generateChecklist(extraction);
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

    // 8. Create rate comparison if competitor info exists
    if (pricing.competitor_name) {
      await supabase.from("rate_comparisons").insert({
        deal_id: dealId,
        competitor_name: pricing.competitor_name,
        competitor_setup_fee: pricing.competitor_setup_fee,
        competitor_monthly_fee: pricing.competitor_monthly_fee,
        competitor_qualified_rate: pricing.competitor_qualified_rate,
        competitor_non_qual_rate: pricing.competitor_non_qual_rate,
        trade_component: pricing.trade_component,
        notes: pricing.our_pricing_approach,
      });
    }

    // 9. Create principals from extracted info
    const principalInfos = extraction.underwriting_risk.principal_info || [];
    for (const p of principalInfos) {
      if (p.name) {
        await supabase.from("principals").insert({
          deal_id: dealId,
          name: p.name,
          ownership_percentage: p.ownership_pct,
        });
      }
    }

    return NextResponse.json(
      {
        deal,
        extraction,
        checklist_count: checklistItems.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Transcript deal creation error:", error);
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
