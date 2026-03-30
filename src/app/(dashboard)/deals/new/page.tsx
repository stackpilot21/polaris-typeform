"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { AIExtraction } from "@/types";

type Step = "input" | "processing" | "review";
type Mode = "transcript" | "manual";

export default function NewDealPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("transcript");
  const [step, setStep] = useState<Step>("input");
  const [callTranscript, setCallTranscript] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [checklistCount, setChecklistCount] = useState(0);
  const [dealId, setDealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

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

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setManualLoading(true);
    const form = new FormData(e.currentTarget);
    const merchantName = form.get("merchant_name") as string;

    try {
      const dealsRes = await fetch("/api/deals");
      if (dealsRes.ok) {
        const deals = await dealsRes.json();
        const duplicate = deals.find(
          (d: { merchant_name: string }) =>
            d.merchant_name.toLowerCase() === merchantName.toLowerCase()
        );
        if (duplicate) {
          const confirmed = confirm(
            `A deal for "${duplicate.merchant_name}" already exists. Create another?`
          );
          if (!confirmed) {
            setManualLoading(false);
            return;
          }
        }
      }
    } catch {
      // If check fails, proceed anyway
    }

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_name: merchantName,
        contact_name: (form.get("contact_name") as string) || "TBD",
        contact_email: (form.get("contact_email") as string) || "tbd@pending.com",
        contact_phone: (form.get("contact_phone") as string) || "TBD",
        notes: form.get("notes") || null,
      }),
    });

    if (res.ok) {
      const deal = await res.json();
      router.push(`/deals/${deal.id}`);
    } else {
      setManualLoading(false);
      alert("Failed to create deal");
    }
  }

  // Processing spinner
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
              <Badge key={label} variant="outline" className="animate-pulse text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Review extraction
  if (step === "review" && extraction) {
    const mp = extraction.merchant_profile;
    const ci = extraction.contact_info;
    const pd = extraction.processing_details;
    const ur = extraction.underwriting_risk;
    const pr = extraction.pricing;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Merchant Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Business" value={mp.business_name} />
                <Row label="Industry" value={mp.industry} />
                <Row label="Type" value={mp.business_model} />
                <Row label="Years" value={mp.years_in_business ? `${mp.years_in_business}${mp.ein_age_months ? ` (EIN: ${mp.ein_age_months}mo)` : ""}` : null} />
                <Row label="Referral" value={mp.referral_source} />
                <Row label="Website" value={mp.website} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={ci.contact_name} />
                <Row label="Phone" value={ci.contact_phone} />
                <Row label="Email" value={ci.contact_email} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Environment" value={pd.card_not_present && pd.card_present ? "CP + CNP" : pd.card_not_present ? "Card Not Present" : "Card Present"} />
                <Row label="POS" value={pd.needs_pos ? "Yes" : "No"} />
                <Row label="Gateway" value={pd.needs_gateway ? pd.gateway_preference || "Yes — TBD" : "No"} />
                <Row label="Monthly Vol" value={pd.monthly_volume_estimate ? `$${pd.monthly_volume_estimate.toLocaleString()}` : null} />
                <Row label="High Ticket" value={pd.high_ticket_expected ? `$${pd.high_ticket_expected.toLocaleString()}` : null} />
                <Row label="Initial Limit" value={pd.high_ticket_initial_limit ? `$${pd.high_ticket_initial_limit.toLocaleString()}` : null} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Risk & Underwriting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Risk:</span>
                  <Badge className={ur.risk_level === "HIGH" ? "bg-red-100 text-red-800" : ur.risk_level === "MEDIUM" ? "bg-yellow-100 text-yellow-800" : ur.risk_level === "LOW" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {ur.risk_level}
                  </Badge>
                </div>
                {ur.risk_factors.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {ur.risk_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#F8AA02] mt-0.5">&#x2022;</span>{f}
                      </li>
                    ))}
                  </ul>
                )}
                {ur.ownership_structure && <p className="text-sm">{ur.ownership_structure}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {pr.competitor_name && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Competitor: {pr.competitor_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {pr.competitor_setup_fee != null && <div><p className="text-muted-foreground">Setup</p><p className="font-medium">${pr.competitor_setup_fee}</p></div>}
                {pr.competitor_monthly_fee != null && <div><p className="text-muted-foreground">Monthly</p><p className="font-medium">${pr.competitor_monthly_fee}</p></div>}
                {pr.competitor_qualified_rate != null && <div><p className="text-muted-foreground">Qualified</p><p className="font-medium">{pr.competitor_qualified_rate}%</p></div>}
                {pr.competitor_non_qual_rate != null && <div><p className="text-muted-foreground">Non-Qual</p><p className="font-medium">{pr.competitor_non_qual_rate}%</p></div>}
              </div>
              {(pr.our_pricing_approach || pr.trade_component) && (
                <>
                  <Separator className="my-3" />
                  <dl className="space-y-2 text-sm">
                    <Row label="Our Approach" value={pr.our_pricing_approach} />
                    <Row label="Trade" value={pr.trade_component} />
                    <Row label="Setup" value={pr.setup_fee_arrangement} />
                  </dl>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {extraction.action_items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Action Items ({checklistCount} in checklist)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {extraction.action_items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm py-1.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.owner === "jason" ? "bg-[#0169B4]" : item.owner === "ran" ? "bg-[#00B6ED]" : item.owner === "merchant" ? "bg-[#F8AA02]" : "bg-gray-400"}`} />
                    <p className="flex-1">{item.task}</p>
                    <Badge variant="outline" className="text-xs shrink-0">{item.owner}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {extraction.strategic_notes.length > 0 && (
          <Card className="border-[#F8AA02]/30 bg-[#FFF9E6]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Strategic Notes (Internal)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {extraction.strategic_notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#F8AA02] mt-0.5">&#x2022;</span>{note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 pb-8">
          <Button onClick={() => router.push(`/deals/${dealId}`)}>Go to Deal &rarr;</Button>
          <Button variant="outline" onClick={() => { setStep("input"); setExtraction(null); setDealId(null); setCallTranscript(""); setInternalNotes(""); }}>
            Process Another
          </Button>
        </div>
      </div>
    );
  }

  // Input step — transcript first, manual as fallback
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-[#1a1a2e]">New Deal</h2>
        <div className="flex gap-1 mt-3 bg-[#f0f4f8] rounded-lg p-1 w-fit">
          <button
            onClick={() => setMode("transcript")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "transcript"
                ? "bg-white text-[#0169B4] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Paste Transcript
            </span>
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "manual"
                ? "bg-white text-[#0169B4] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>
      )}

      {mode === "transcript" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the Aircall or call transcript here..."
                value={callTranscript}
                onChange={(e) => setCallTranscript(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                autoFocus
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="w-4 h-4 text-[#F8AA02]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Internal Notes (Loom / Voice Memo)
                <span className="text-xs font-normal text-muted-foreground ml-1">optional</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your Loom transcript or voice notes for Ran here..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleProcess}
            disabled={!callTranscript.trim() && !internalNotes.trim()}
            className="bg-[#0169B4] hover:bg-[#0157a0]"
            size="lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Process with AI &amp; Create Deal
          </Button>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Merchant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="merchant_name">Business Name *</Label>
                <Input id="merchant_name" name="merchant_name" required />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input id="contact_name" name="contact_name" placeholder="Optional — can add later" />
              </div>
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="contact_email" type="email" placeholder="Optional — can add later" />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" name="contact_phone" type="tel" placeholder="Optional — can add later" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional" />
              </div>
              <Button type="submit" disabled={manualLoading}>
                {manualLoading ? "Creating..." : "Create Deal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0 w-28">{label}:</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground italic"}>{value || "TBD"}</dd>
    </div>
  );
}
