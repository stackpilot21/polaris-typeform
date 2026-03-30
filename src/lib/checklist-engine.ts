import type { AIExtraction, ChecklistOwner } from "@/types";

interface GeneratedTask {
  task: string;
  owner: ChecklistOwner;
  due_date: string | null;
  sort_order: number;
  notes: string | null;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i);
    months.push(
      d.toLocaleString("en-US", { month: "long", year: "numeric" })
    );
  }
  return months;
}

export function generateChecklist(extraction: AIExtraction): GeneratedTask[] {
  const items: GeneratedTask[] = [];
  let order = 0;

  // === ALWAYS REQUIRED ===
  items.push({
    task: "Collect voided check or bank letter",
    owner: "merchant",
    due_date: addDays(7),
    sort_order: order++,
    notes: null,
  });

  // === BANK STATEMENTS (auto-calculate which months) ===
  const months = getRecentMonths(3);
  for (const month of months) {
    items.push({
      task: `Collect bank statement: ${month}`,
      owner: "merchant",
      due_date: addDays(7),
      sort_order: order++,
      notes: null,
    });
  }

  // === PRINCIPAL-BASED ===
  const principals = extraction.underwriting_risk.principal_info || [];
  for (const p of principals) {
    if (p.name) {
      if (
        p.info_status?.toLowerCase().includes("pending") ||
        p.info_status?.toLowerCase().includes("needed") ||
        !p.info_status
      ) {
        items.push({
          task: `Collect SSN for ${p.name}`,
          owner: "merchant",
          due_date: addDays(5),
          sort_order: order++,
          notes: "Call Jason directly with SSN — do not email",
        });
        items.push({
          task: `Collect ID/passport for ${p.name}`,
          owner: "merchant",
          due_date: addDays(7),
          sort_order: order++,
          notes: null,
        });
      }
    }
  }

  // === RISK ASSESSMENT ===
  const riskLevel = extraction.underwriting_risk.risk_level;
  if (riskLevel === "TBD" || riskLevel === "HIGH") {
    items.push({
      task: "Send merchant website to Maverick for risk assessment",
      owner: "ran",
      due_date: addDays(1),
      sort_order: order++,
      notes: null,
    });
    items.push({
      task: "Send merchant website to Ricky for review",
      owner: "ran",
      due_date: addDays(1),
      sort_order: order++,
      notes: null,
    });
    items.push({
      task: "Get risk determination from processor",
      owner: "jason",
      due_date: addDays(5),
      sort_order: order++,
      notes: "Waiting on Maverick/Ricky review",
    });
  }
  if (riskLevel === "HIGH") {
    items.push({
      task: "Evaluate BusyPay as processor option",
      owner: "jason",
      due_date: addDays(5),
      sort_order: order++,
      notes: null,
    });
    items.push({
      task: "Reprice for high risk if BusyPay declines",
      owner: "jason",
      due_date: addDays(7),
      sort_order: order++,
      notes: null,
    });
  }

  // === GATEWAY ===
  if (extraction.processing_details.needs_gateway) {
    const pref = extraction.processing_details.gateway_preference;
    items.push({
      task: `Determine gateway${pref ? ` (preference: ${pref})` : ""}`,
      owner: "jason",
      due_date: addDays(3),
      sort_order: order++,
      notes: null,
    });
  }

  // === EQUIPMENT ===
  if (
    extraction.processing_details.card_present ||
    extraction.processing_details.needs_pos
  ) {
    items.push({
      task: "Determine equipment needs and trade pricing",
      owner: "jason",
      due_date: addDays(5),
      sort_order: order++,
      notes: null,
    });
  }

  // === EIN MISMATCH ===
  if (
    extraction.merchant_profile.ein_age_months &&
    extraction.merchant_profile.years_in_business &&
    extraction.merchant_profile.years_in_business > 2 &&
    extraction.merchant_profile.ein_age_months < 24
  ) {
    items.push({
      task: "Document business history (EIN newer than actual business age)",
      owner: "ran",
      due_date: addDays(3),
      sort_order: order++,
      notes: `Business is ${extraction.merchant_profile.years_in_business} years old but EIN is ~${extraction.merchant_profile.ein_age_months} months old`,
    });
  }

  // === TRADE/BARTER ===
  const referral = extraction.merchant_profile.referral_source?.toLowerCase() || "";
  if (referral.includes("itex") || referral.includes("barter") || referral.includes("trade")) {
    items.push({
      task: "Process trade component for setup fee",
      owner: "ran",
      due_date: addDays(3),
      sort_order: order++,
      notes: extraction.pricing.trade_component || null,
    });
  }

  // === UNDERWRITING SUBMISSION ===
  items.push({
    task: "Compile and submit underwriting package",
    owner: "ran",
    due_date: addDays(10),
    sort_order: order++,
    notes: "After all documents collected",
  });

  // === AI-EXTRACTED ACTION ITEMS (merge, deduplicate) ===
  for (const aiItem of extraction.action_items) {
    const isDuplicate = items.some(
      (i) =>
        i.task.toLowerCase().includes(aiItem.task.toLowerCase().slice(0, 25)) ||
        aiItem.task.toLowerCase().includes(i.task.toLowerCase().slice(0, 25))
    );
    if (!isDuplicate) {
      const owner = normalizeOwner(aiItem.owner);
      items.push({
        task: aiItem.task,
        owner,
        due_date: aiItem.deadline || addDays(7),
        sort_order: order++,
        notes: null,
      });
    }
  }

  // === POST-APPROVAL (deferred tasks) ===
  items.push({
    task: "Set up gateway credentials and send merchant login info",
    owner: "ran",
    due_date: null,
    sort_order: order++,
    notes: "After approval",
  });
  items.push({
    task: "30-day check-in: review volume, consider limit increase",
    owner: "jason",
    due_date: addDays(30),
    sort_order: order++,
    notes: null,
  });
  items.push({
    task: "60-day check-in: review for high-ticket limit increase",
    owner: "jason",
    due_date: addDays(60),
    sort_order: order++,
    notes: null,
  });

  return items;
}

function normalizeOwner(raw: string): ChecklistOwner {
  const lower = raw.toLowerCase().trim();
  if (lower === "jason" || lower.includes("jason")) return "jason";
  if (lower === "ran" || lower.includes("ran") || lower.includes("assistant"))
    return "ran";
  if (
    lower === "merchant" ||
    lower.includes("merchant") ||
    lower.includes("nick") ||
    lower.includes("client") ||
    lower.includes("owner")
  )
    return "merchant";
  if (lower.includes("underw")) return "underwriting";
  return "ran"; // default to assistant
}
