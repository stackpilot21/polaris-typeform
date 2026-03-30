import Anthropic from "@anthropic-ai/sdk";
import type { AIExtraction } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const EXTRACTION_PROMPT = `You are an AI assistant for Polaris Payments, a merchant services company. You will be given a call transcript and/or internal voice notes (from Loom or similar). Your job is to extract structured merchant onboarding data.

Extract the following information. If a field is unknown or not mentioned, use null — NEVER guess.

Return ONLY valid JSON matching this exact structure (no markdown, no code blocks, just raw JSON):

{
  "merchant_profile": {
    "business_name": string | null,
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
- If the internal notes contradict or override something from the call transcript (e.g., "disregard the principal info"), reflect that in the output`;

export async function extractFromTranscript(
  callTranscript: string,
  internalNotes: string
): Promise<AIExtraction> {
  let userContent = "";

  if (callTranscript.trim()) {
    userContent += `CALL TRANSCRIPT:\n${callTranscript}\n\n`;
  }

  if (internalNotes.trim()) {
    userContent += `INTERNAL NOTES (Loom/voice memo):\n${internalNotes}\n\n`;
  }

  userContent +=
    "Extract the structured merchant data from the above. Return ONLY the JSON object, no other text.";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    system: EXTRACTION_PROMPT,
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
