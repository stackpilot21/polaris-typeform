"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { AIExtraction } from "@/types";

type Step = "input" | "processing" | "review";

export default function TranscriptIntakePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [callTranscript, setCallTranscript] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [checklistCount, setChecklistCount] = useState(0);
  const [dealId, setDealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProcess() {
    if (!callTranscript.trim() && !internalNotes.trim()) {
      toast.error("Paste at least a call transcript or internal notes");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      const res = await fetch("/api/deals/from-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_transcript: callTranscript,
          internal_notes: internalNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process transcript");
      }

      const data = await res.json();
      setExtraction(data.extraction);
      setChecklistCount(data.checklist_count);
      setDealId(data.deal.id);
      setStep("review");
      toast.success("Transcript processed — deal created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep("input");
      toast.error("Failed to process transcript");
    }
  }

  if (step === "processing") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#d8e3ef] border-t-[#0169B4] rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-heading font-bold text-[#1a1a2e]">
              Processing Transcript
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Claude is extracting merchant data, generating your checklist, and
              creating the deal...
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {[
              "Extracting merchant profile",
              "Identifying risk factors",
              "Generating checklist",
              "Creating rate comparison",
            ].map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="animate-pulse text-xs"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "review" && extraction) {
    const mp = extraction.merchant_profile;
    const ci = extraction.contact_info;
    const pd = extraction.processing_details;
    const ur = extraction.underwriting_risk;
    const pr = extraction.pricing;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-[#1a1a2e]">
              Deal Created from Transcript
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review the extracted data below. {checklistCount} checklist items
              auto-generated.
            </p>
          </div>
          <Button onClick={() => router.push(`/deals/${dealId}`)}>
            Go to Deal &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merchant Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#0169B4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Merchant Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Business" value={mp.business_name} />
                <Row label="Industry" value={mp.industry} />
                <Row label="Type" value={mp.business_model} />
                <Row
                  label="Years in Business"
                  value={
                    mp.years_in_business
                      ? `${mp.years_in_business} years${
                          mp.ein_age_months
                            ? ` (EIN: ${mp.ein_age_months} months)`
                            : ""
                        }`
                      : null
                  }
                />
                <Row label="Referral" value={mp.referral_source} />
                <Row label="Website" value={mp.website} isWebsite />
              </dl>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#0169B4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={ci.contact_name} />
                <Row label="Phone" value={ci.contact_phone} />
                <Row label="Email" value={ci.contact_email} />
              </dl>
            </CardContent>
          </Card>

          {/* Processing Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#0169B4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Processing Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row
                  label="Environment"
                  value={
                    pd.card_not_present && pd.card_present
                      ? "Card Present + Not Present"
                      : pd.card_not_present
                      ? "Card Not Present"
                      : "Card Present"
                  }
                />
                <Row label="POS Needed" value={pd.needs_pos ? "Yes" : "No"} />
                <Row
                  label="Gateway"
                  value={
                    pd.needs_gateway
                      ? pd.gateway_preference || "Yes — TBD"
                      : "No"
                  }
                />
                <Row label="ACH" value={pd.needs_ach ? "Yes" : "No"} />
                <Row
                  label="Monthly Volume"
                  value={
                    pd.monthly_volume_estimate
                      ? `$${pd.monthly_volume_estimate.toLocaleString()}`
                      : null
                  }
                />
                <Row
                  label="Avg Transaction"
                  value={
                    pd.avg_transaction_size
                      ? `$${pd.avg_transaction_size.toLocaleString()}`
                      : null
                  }
                />
                <Row
                  label="High Ticket (Expected)"
                  value={
                    pd.high_ticket_expected
                      ? `$${pd.high_ticket_expected.toLocaleString()}`
                      : null
                  }
                />
                <Row
                  label="High Ticket (Initial Limit)"
                  value={
                    pd.high_ticket_initial_limit
                      ? `$${pd.high_ticket_initial_limit.toLocaleString()}`
                      : null
                  }
                />
              </dl>
            </CardContent>
          </Card>

          {/* Risk & Underwriting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#0169B4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Risk & Underwriting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Risk Level:
                  </span>
                  <Badge
                    className={
                      ur.risk_level === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : ur.risk_level === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-800"
                        : ur.risk_level === "LOW"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {ur.risk_level}
                  </Badge>
                </div>
                {ur.risk_factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Risk Factors:
                    </p>
                    <ul className="text-sm space-y-1">
                      {ur.risk_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#F8AA02] mt-0.5">&#x2022;</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ur.ownership_structure && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Ownership:
                    </p>
                    <p className="text-sm">{ur.ownership_structure}</p>
                  </div>
                )}
                {ur.principal_info.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Principals:
                    </p>
                    {ur.principal_info.map((p, i) => (
                      <p key={i} className="text-sm">
                        {p.name || "Unknown"}{" "}
                        {p.ownership_pct ? `(${p.ownership_pct}%)` : ""}{" "}
                        {p.info_status && (
                          <span className="text-muted-foreground">
                            — {p.info_status}
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing / Competitor */}
        {pr.competitor_name && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Competitor: {pr.competitor_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {pr.competitor_setup_fee != null && (
                  <div>
                    <p className="text-muted-foreground">Setup Fee</p>
                    <p className="font-medium">
                      ${pr.competitor_setup_fee}
                    </p>
                  </div>
                )}
                {pr.competitor_monthly_fee != null && (
                  <div>
                    <p className="text-muted-foreground">Monthly Fee</p>
                    <p className="font-medium">
                      ${pr.competitor_monthly_fee}
                    </p>
                  </div>
                )}
                {pr.competitor_qualified_rate != null && (
                  <div>
                    <p className="text-muted-foreground">Qualified Rate</p>
                    <p className="font-medium">
                      {pr.competitor_qualified_rate}%
                    </p>
                  </div>
                )}
                {pr.competitor_non_qual_rate != null && (
                  <div>
                    <p className="text-muted-foreground">Non-Qual Rate</p>
                    <p className="font-medium">
                      {pr.competitor_non_qual_rate}%
                    </p>
                  </div>
                )}
              </div>
              {(pr.our_pricing_approach || pr.trade_component) && (
                <>
                  <Separator className="my-3" />
                  <dl className="space-y-2 text-sm">
                    <Row label="Our Approach" value={pr.our_pricing_approach} />
                    <Row label="Trade Component" value={pr.trade_component} />
                    <Row
                      label="Setup Fee Arrangement"
                      value={pr.setup_fee_arrangement}
                    />
                  </dl>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Items */}
        {extraction.action_items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Action Items ({extraction.action_items.length} extracted,{" "}
                {checklistCount} total in checklist)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {extraction.action_items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm py-1.5"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        item.owner === "jason"
                          ? "bg-[#0169B4]"
                          : item.owner === "ran"
                          ? "bg-[#00B6ED]"
                          : item.owner === "merchant"
                          ? "bg-[#F8AA02]"
                          : "bg-gray-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p>{item.task}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.owner}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strategic Notes */}
        {extraction.strategic_notes.length > 0 && (
          <Card className="border-[#F8AA02]/30 bg-[#FFF9E6]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Strategic Notes (Internal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {extraction.strategic_notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#F8AA02] mt-0.5">&#x2022;</span>
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 pb-8">
          <Button onClick={() => router.push(`/deals/${dealId}`)}>
            Go to Deal &rarr;
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStep("input");
              setExtraction(null);
              setDealId(null);
              setCallTranscript("");
              setInternalNotes("");
            }}
          >
            Process Another
          </Button>
        </div>
      </div>
    );
  }

  // Input step
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-[#1a1a2e]">
          New Deal from Transcript
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a call transcript and/or your Loom notes. Claude will extract
          merchant data, create the deal, and auto-generate your checklist.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#0169B4]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Call Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="transcript" className="sr-only">
            Call Transcript
          </Label>
          <Textarea
            id="transcript"
            placeholder="Paste the Aircall or call transcript here..."
            value={callTranscript}
            onChange={(e) => setCallTranscript(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Include the full transcript — timestamps, speaker labels, and
            all. Claude handles the mess.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#F8AA02]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Internal Notes (Loom / Voice Memo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="notes" className="sr-only">
            Internal Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Paste your Loom transcript or voice notes for Ran here..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            These are internal only — strategic decisions, routing notes,
            pricing strategy. Never shared with the merchant.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleProcess}
          disabled={!callTranscript.trim() && !internalNotes.trim()}
          className="bg-[#0169B4] hover:bg-[#0157a0]"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Process with AI
        </Button>
        <Button variant="outline" onClick={() => router.push("/deals/new")}>
          Manual Entry Instead
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, isWebsite }: { label: string; value: string | null | undefined; isWebsite?: boolean }) {
  function formatWebsite(url: string) {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase();
  }
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0 w-36">{label}:</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground italic"}>
        {isWebsite ? (
          value ? (
            <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[#0169B4] hover:underline">
              {formatWebsite(value)}
            </a>
          ) : "Not provided"
        ) : (
          value || "TBD"
        )}
      </dd>
    </div>
  );
}
