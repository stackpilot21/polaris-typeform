import Anthropic from "@anthropic-ai/sdk";
import type { AIExtraction } from "@/types";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function getKnowledgeBaseInstructions(): Promise<string> {
  const { data } = await supabase
    .from("knowledge_base")
    .select("content")
    .eq("category", "instructions")
    .limit(1);
  return data?.[0]?.content?.trim() || "";
}

const EXTRACTION_PROMPT = `You are an AI assistant for Polaris Payments, a merchant services company. You will be given up to three sources of information about a new merchant:

1. CALL TRANSCRIPT — a recorded call between Jason (Polaris) and the merchant
2. FORM SUBMISSION — structured data the merchant submitted via an application form (Typeform, website form, etc.)
3. INTERNAL NOTES — voice memos or Loom transcripts from Jason to his assistant Ran, containing internal strategy and decisions

Any combination of these may be provided. Your job is to merge ALL sources into one unified, structured merchant profile.

MERGING RULES:
- Form data is the most reliable for exact values (business name, EIN, address, phone, email, volume numbers, ownership %)
- Call transcript provides context, nuance, and details not captured in forms (risk factors, pricing discussions, relationship notes)
- Internal notes override both — if Jason says "disregard the principal info" or "we might route this to BusyPay", that takes priority
- When sources conflict, prefer: internal notes > call transcript > form data (for strategic decisions), but form data > call transcript (for factual data like names, numbers, addresses)

Extract the following information. If a field is unknown or not mentioned in ANY source, use null — NEVER guess.

Return ONLY valid JSON matching this exact structure (no markdown, no code blocks, just raw JSON):

{
  "merchant_profile": {
    "business_name": string | null,
    "dba_name": string | null,
    "legal_name": string | null,
    "business_type": string | null,
    "industry": string | null,
    "business_model": "B2B" | "B2C" | "both" | null,
    "years_in_business": number | null,
    "ein_age_months": number | null,
    "referral_source": string | null,
    "referral_contact": string | null,
    "website": string | null
  },
  "contact_info": {
    "contact_name": string | null,
    "contact_phone": string | null,
    "contact_email": string | null
  },
  "processing_details": {
    "card_present": boolean,
    "card_not_present": boolean,
    "needs_pos": boolean,
    "needs_gateway": boolean,
    "gateway_preference": string | null,
    "needs_ach": boolean,
    "monthly_volume_estimate": number | null,
    "avg_transaction_size": number | null,
    "high_ticket_expected": number | null,
    "high_ticket_initial_limit": number | null
  },
  "underwriting_risk": {
    "risk_level": "LOW" | "MEDIUM" | "HIGH" | "TBD",
    "risk_factors": string[],
    "documents_needed": string[],
    "ownership_structure": string | null,
    "principal_info": [
      {
        "name": string | null,
        "ownership_pct": number | null,
        "info_status": string | null
      }
    ]
  },
  "pricing": {
    "competitor_name": string | null,
    "competitor_setup_fee": number | null,
    "competitor_monthly_fee": number | null,
    "competitor_qualified_rate": number | null,
    "competitor_non_qual_rate": number | null,
    "our_pricing_approach": string | null,
    "trade_component": string | null,
    "setup_fee_arrangement": string | null
  },
  "action_items": [
    {
      "task": string,
      "owner": "jason" | "ran" | "merchant" | "underwriting",
      "deadline": string | null
    }
  ],
  "strategic_notes": string[]
}

Important rules:
- For owner assignment: "jason" for Jason Keil / strategic decisions, "ran" for Ran / assistant tasks, "merchant" for things the merchant needs to provide, "underwriting" for processor/underwriter actions
- For risk_level: Use "TBD" if not explicitly determined. Use context clues (card-not-present, new EIN, high tickets) to note risk_factors even if level is TBD
- For documents_needed: Include standard items (bank statements with specific months, voided check, ID/passport, SSN) based on what's discussed
- For strategic_notes: Capture internal-only decisions from Loom/voice notes — processor routing, pricing strategy, risk mitigation approaches
- For monthly_volume_estimate: Use the number if stated, convert to monthly if given as annual
- Dollar amounts should be numbers (not strings). Rates should be decimal (3.5% = 3.5, not 0.035)
- If the internal notes contradict or override something from the call transcript (e.g., "disregard the principal info"), reflect that in the output
- Form submissions may use different field names — interpret them intelligently (e.g., "Average Ticket" = avg_transaction_size, "Monthly CC Volume" = monthly_volume_estimate, "CP/CNP ratio" = card_present/card_not_present split)
- business_name is the primary name used to identify the merchant. dba_name is "doing business as" (the public-facing name). legal_name is the registered legal entity name. They may be the same — if only one name is given, put it in business_name and leave dba/legal null unless you can distinguish them`;

export async function extractFromTranscript(
  callTranscript: string,
  internalNotes: string,
  formData?: string
): Promise<AIExtraction> {
  let userContent = "";

  if (callTranscript.trim()) {
    userContent += `CALL TRANSCRIPT:\n${callTranscript}\n\n`;
  }

  if (formData?.trim()) {
    userContent += `FORM SUBMISSION (merchant-submitted application data):\n${formData}\n\n`;
  }

  if (internalNotes.trim()) {
    userContent += `INTERNAL NOTES (Loom/voice memo — internal only, overrides other sources for strategy):\n${internalNotes}\n\n`;
  }

  userContent +=
    "Extract and merge the structured merchant data from ALL sources above into one unified profile. Return ONLY the JSON object, no other text.";

  // Include knowledge base instructions for corrections and rules
  const kbInstructions = await getKnowledgeBaseInstructions();
  let systemPrompt = EXTRACTION_PROMPT;
  if (kbInstructions) {
    systemPrompt += `\n\nADDITIONAL INSTRUCTIONS (always follow these — they correct common errors and apply domain-specific rules):\n${kbInstructions}`;
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    system: systemPrompt,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON, stripping any accidental markdown wrapping
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const extraction: AIExtraction = JSON.parse(jsonText);
  return extraction;
}

export interface DocumentExtraction {
  processor_name: string | null;
  rates: {
    qualified_rate: number | null;
    mid_qual_rate: number | null;
    non_qual_rate: number | null;
    per_transaction_fee: number | null;
    monthly_fee: number | null;
    annual_fee: number | null;
    setup_fee: number | null;
    pci_fee: number | null;
    early_termination_fee: number | null;
    batch_fee: number | null;
    statement_fee: number | null;
    chargeback_fee: number | null;
  };
  pricing_model: string | null;
  contract_term: string | null;
  effective_rate: number | null;
  notes: string[];
}

const DOCUMENT_EXTRACTION_PROMPT = `You are an AI assistant for Polaris Payments, a merchant services company. You will be given an image or PDF of a merchant processing agreement, rate sheet, statement, or pricing proposal.

Extract ALL rates, fees, and pricing details you can find. Return ONLY valid JSON (no markdown, no code blocks):

{
  "processor_name": string | null,
  "rates": {
    "qualified_rate": number | null,
    "mid_qual_rate": number | null,
    "non_qual_rate": number | null,
    "per_transaction_fee": number | null,
    "monthly_fee": number | null,
    "annual_fee": number | null,
    "setup_fee": number | null,
    "pci_fee": number | null,
    "early_termination_fee": number | null,
    "batch_fee": number | null,
    "statement_fee": number | null,
    "chargeback_fee": number | null
  },
  "pricing_model": string | null,
  "contract_term": string | null,
  "effective_rate": number | null,
  "notes": string[]
}

Rules:
- Rates as percentages (3.5% = 3.5, not 0.035)
- Dollar fees as numbers (9.95 not "$9.95")
- pricing_model: "tiered", "interchange_plus", "flat_rate", "surcharge", or null
- notes: anything else notable (e.g., "includes free terminal", "3-year contract", "waived PCI fee for first year")
- If you see multiple rate tiers or categories, map them to qualified/mid_qual/non_qual as best you can
- If it's interchange-plus, put the markup in qualified_rate and note the model
- If you can't determine a value, use null — never guess`;

export async function extractFromDocument(
  fileBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf"
): Promise<DocumentExtraction> {
  const imageContent = mediaType === "application/pdf"
    ? { type: "document" as const, source: { type: "base64" as const, media_type: mediaType, data: fileBase64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: fileBase64 } };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          imageContent,
          { type: "text", text: "Extract all rates, fees, and pricing details from this document. Return ONLY the JSON object." },
        ],
      },
    ],
    system: DOCUMENT_EXTRACTION_PROMPT,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonText);
}
