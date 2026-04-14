import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const CHAT_SYSTEM_INSTRUCTIONS = `You are a helpful assistant for Polaris Payments, a merchant services company. You have access to the current deals data from the Polaris onboarding dashboard.

Your job is to answer questions about deals, merchants, documents, follow-up sequences, and onboarding status based on the data provided.

Rules:
- Be concise and direct. This is an internal tool — no need for pleasantries or disclaimers.
- If the data doesn't contain the answer, say so clearly.
- When referencing numbers (volume, amounts), format them nicely (e.g., "$150,000/month").
- If asked about trends or comparisons, work with what's in the data — don't speculate beyond it.
- You can do simple calculations (totals, averages, counts) based on the data.`;

export async function POST(request: Request) {
  try {
    const { message, conversationHistory, dealIds } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // If specific deal IDs are provided, scope queries to those deals
    const scopedDealIds: string[] | null =
      Array.isArray(dealIds) && dealIds.length > 0 ? dealIds : null;

    // Helper to optionally filter by deal_id
    function scopeQuery(table: string, selectCols: string) {
      const q = supabase.from(table).select(selectCols);
      return scopedDealIds ? q.in("deal_id", scopedDealIds) : q;
    }

    // Fetch deals and related data in parallel
    const dealsQuery = supabase.from("deals").select("*");
    if (scopedDealIds) dealsQuery.in("id", scopedDealIds);

    const [
      dealsResult,
      documentsResult,
      principalsResult,
      sequencesResult,
      profilesResult,
      ratesResult,
      checklistResult,
      transcriptsResult,
      summariesResult,
      kbResult,
    ] = await Promise.all([
      dealsQuery,
      scopeQuery("documents", "*"),
      scopeQuery("principals", "id, deal_id, name, phone, email, dob, address_line1, address_line2, city, state, zip, ownership_percentage, submitted_at, created_at"),
      scopeQuery("follow_up_sequences", "*"),
      scopeQuery("processing_profiles", "*"),
      scopeQuery("rate_comparisons", "*"),
      scopeQuery("checklist_items", "*"),
      scopeQuery("transcripts", "id, deal_id, source, transcript_type, processed_at"),
      scopeQuery("executive_summaries", "*"),
      supabase.from("knowledge_base").select("content").eq("category", "instructions").limit(1),
    ]);

    if (dealsResult.error) {
      return Response.json({ error: "Failed to fetch deals data" }, { status: 500 });
    }

    // Build the context data
    const contextData = {
      deals: dealsResult.data,
      documents: documentsResult.data || [],
      principals: principalsResult.data || [],
      follow_up_sequences: sequencesResult.data || [],
      processing_profiles: profilesResult.data || [],
      rate_comparisons: ratesResult.data || [],
      checklist_items: checklistResult.data || [],
      transcripts: transcriptsResult.data || [],
      executive_summaries: summariesResult.data || [],
    };

    // Build system prompt
    let systemPrompt = CHAT_SYSTEM_INSTRUCTIONS;

    // Append knowledge base instructions if available
    const kbContent = kbResult.data?.[0]?.content?.trim();
    if (kbContent) {
      systemPrompt += `\n\nADDITIONAL INSTRUCTIONS (always follow these — they correct common errors and apply domain-specific rules):\n${kbContent}`;
    }

    // Append deals data
    systemPrompt += `\n\nHere is the current deals data:\n${JSON.stringify(contextData, null, 2)}`;

    // Build messages array with conversation history
    const messages: Anthropic.MessageParam[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    return Response.json({ response: textBlock.text });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
