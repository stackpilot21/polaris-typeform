import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const { data, error } = await supabase
    .from("executive_summaries")
    .select("*")
    .eq("deal_id", dealId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json(null);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const body = await request.json();

  // Get the latest summary for this deal
  const { data: existing } = await supabase
    .from("executive_summaries")
    .select("id")
    .eq("deal_id", dealId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("executive_summaries")
      .update({ content: body.content })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("executive_summaries")
      .insert({ deal_id: dealId, content: body.content });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  // Gather all deal data
  const [dealRes, profileRes, principalsRes, ratesRes, transcriptsRes, kbRes] =
    await Promise.all([
      supabase.from("deals").select("*").eq("id", dealId).single(),
      supabase.from("processing_profiles").select("*").eq("deal_id", dealId).single(),
      supabase.from("principals").select("*").eq("deal_id", dealId),
      supabase.from("rate_comparisons").select("*").eq("deal_id", dealId),
      supabase.from("transcripts").select("raw_text, transcript_type").eq("deal_id", dealId),
      supabase.from("knowledge_base").select("content").eq("category", "executive_summary"),
    ]);

  const deal = dealRes.data;
  const profile = profileRes.data;
  const principals = principalsRes.data || [];
  const rates = ratesRes.data || [];
  const transcripts = transcriptsRes.data || [];
  const examples = kbRes.data || [];

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Build context for Claude
  let dealContext = `MERCHANT: ${deal.merchant_name}\n`;
  dealContext += `Contact: ${deal.contact_name} | ${deal.contact_email} | ${deal.contact_phone}\n`;
  dealContext += `Status: ${deal.status}\n`;
  if (deal.notes) dealContext += `Notes: ${deal.notes}\n`;

  if (profile) {
    dealContext += `\nPROCESSING PROFILE:\n`;
    if (profile.dba_name) dealContext += `DBA: ${profile.dba_name}\n`;
    if (profile.legal_name) dealContext += `Legal Name: ${profile.legal_name}\n`;
    if (profile.industry) dealContext += `Industry: ${profile.industry}\n`;
    if (profile.business_type) dealContext += `Business Type: ${profile.business_type}\n`;
    if (profile.years_in_business) dealContext += `Years in Business: ${profile.years_in_business}\n`;
    if (profile.ein_age_months) dealContext += `EIN Age: ${profile.ein_age_months} months\n`;
    if (profile.website) dealContext += `Website: ${profile.website}\n`;
    if (profile.referral_source) dealContext += `Referral: ${profile.referral_source}\n`;
    dealContext += `Card Present: ${profile.card_present}\n`;
    dealContext += `Card Not Present: ${profile.card_not_present}\n`;
    dealContext += `Needs POS: ${profile.needs_pos}\n`;
    dealContext += `Needs Gateway: ${profile.needs_gateway}\n`;
    if (profile.gateway_preference) dealContext += `Gateway: ${profile.gateway_preference}\n`;
    dealContext += `Needs ACH: ${profile.needs_ach}\n`;
    if (profile.monthly_volume_estimate) dealContext += `Monthly Volume: $${profile.monthly_volume_estimate}\n`;
    if (profile.avg_transaction_size) dealContext += `Average Transaction: $${profile.avg_transaction_size}\n`;
    if (profile.high_ticket_expected) dealContext += `High Ticket Expected: $${profile.high_ticket_expected}\n`;
    if (profile.high_ticket_initial_limit) dealContext += `High Ticket Limit: $${profile.high_ticket_initial_limit}\n`;
    if (profile.risk_level) dealContext += `Risk Level: ${profile.risk_level}\n`;
    if (profile.risk_factors) dealContext += `Risk Factors: ${profile.risk_factors}\n`;
    if (profile.processor) dealContext += `Processor: ${profile.processor}\n`;
    if (profile.trade_component) dealContext += `Trade: ${profile.trade_component}\n`;
    if (profile.setup_fee_arrangement) dealContext += `Setup Fee: ${profile.setup_fee_arrangement}\n`;
    if (profile.strategic_notes) dealContext += `Strategic Notes: ${profile.strategic_notes}\n`;
  }

  if (principals.length > 0) {
    dealContext += `\nPRINCIPALS:\n`;
    for (const p of principals) {
      dealContext += `- ${p.name}`;
      if (p.ownership_percentage) dealContext += ` (${p.ownership_percentage}%)`;
      if (p.city && p.state) dealContext += ` — ${p.city}, ${p.state}`;
      dealContext += `\n`;
    }
  }

  if (rates.length > 0) {
    dealContext += `\nRATE COMPARISONS:\n`;
    for (const r of rates) {
      dealContext += `Competitor: ${r.competitor_name}\n`;
      if (r.competitor_qualified_rate) dealContext += `  Qualified: ${r.competitor_qualified_rate}%\n`;
      if (r.competitor_non_qual_rate) dealContext += `  Non-Qual: ${r.competitor_non_qual_rate}%\n`;
      if (r.competitor_monthly_fee) dealContext += `  Monthly: $${r.competitor_monthly_fee}\n`;
      if (r.notes) dealContext += `  Notes: ${r.notes}\n`;
    }
  }

  // Include transcript content for additional context
  for (const t of transcripts) {
    if (t.transcript_type === "call") {
      dealContext += `\nCALL TRANSCRIPT (for additional context):\n${t.raw_text.slice(0, 3000)}\n`;
    } else if (t.transcript_type === "internal_notes") {
      dealContext += `\nINTERNAL NOTES:\n${t.raw_text.slice(0, 1500)}\n`;
    }
  }

  // Scrape the merchant's website for business context
  const websiteUrl = profile?.website;
  if (websiteUrl) {
    try {
      let url = websiteUrl.trim();
      if (!url.startsWith("http")) url = `https://${url}`;
      const webRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PolarisBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (webRes.ok) {
        const html = await webRes.text();
        // Strip HTML tags, scripts, styles — get plain text
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);
        if (text.length > 100) {
          dealContext += `\nMERCHANT WEBSITE CONTENT (${url}):\n${text}\n`;
        }
      }
    } catch {
      // Website fetch failed — continue without it
      dealContext += `\nNote: Website (${websiteUrl}) could not be reached.\n`;
    }
  }

  // Build the prompt with examples
  let systemPrompt = `You are an AI assistant for Polaris Payments writing executive summaries for merchant underwriting submissions. These summaries are sent to processors/underwriters to get merchants approved.

Write a professional, thorough executive summary following the EXACT format and structure shown in the examples below. The summary should present the merchant in the best possible light while being factually accurate.

Use the exact same section headers and formatting as the examples. Every section must be included even if you need to note "N/A" for some fields.

IMPORTANT: If website content is provided, use it heavily to understand:
- What the company actually does (products, services, pricing)
- How they sell (e-commerce, in-person, invoicing)
- Their target market and customers
- Their fulfillment model (digital delivery, shipping, services)
- Refund/cancellation policies (check footer links, terms pages)
This website context is often the richest source of information about the business.`;

  if (examples.length > 0) {
    systemPrompt += `\n\nHere are ${examples.length} example executive summaries to follow as templates:\n\n`;
    for (let i = 0; i < examples.length; i++) {
      systemPrompt += `--- EXAMPLE ${i + 1} ---\n${examples[i].content}\n\n`;
    }
    systemPrompt += `--- END EXAMPLES ---\n\nFollow the EXACT same format, section headers, and level of detail as these examples. Adapt the content to the specific merchant's data.`;
  } else {
    systemPrompt += `\n\nUse this structure:
- Executive Summary - [Business Name]
- Business Overview (what the company does, years in business and ownership structure, high-level description of products/services)
- Business Model & Sales Process (how sales occur, customer journey from order to fulfillment, refund/cancellation/customer service processes)
- Processing Volume Profile (monthly volume requested, average and maximum transaction, seasonality)
- Target Market (who the customers are, geographic markets served)
- Risk Factors & Mitigations (chargeback exposure, how the business mitigates risk)
- Operational Details (fulfillment method, inventory sourcing, compliance/licensing)
- Reason for Request (why they need the account, if switching providers why)
- Suggested MCC Code`;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate an executive summary for this merchant using ALL available data:\n\n${dealContext}\n\nWrite the complete executive summary now. Use plain text formatting with bold section headers (use **bold** markdown). Be thorough and professional.`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response from Claude");
    }

    const summary = textBlock.text;

    // Save the summary
    await supabase.from("executive_summaries").insert({
      deal_id: dealId,
      content: summary,
    });

    return NextResponse.json({ content: summary });
  } catch (error) {
    console.error("Executive summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate" },
      { status: 500 }
    );
  }
}
