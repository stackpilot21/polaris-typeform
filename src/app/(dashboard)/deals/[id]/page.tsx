"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Deal, Document, Principal, FollowUpSequence, DOCUMENT_TYPE_LABELS, DEAL_STATUS_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SSNInput } from "@/components/ssn-input";

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

function statusBadge(status: string) {
  switch (status) {
    case "MISSING":
      return <Badge variant="destructive">Missing</Badge>;
    case "SUBMITTED":
      return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>;
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [sequence, setSequence] = useState<FollowUpSequence | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDeal = useCallback(async () => {
    const res = await fetch(`/api/deals/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDeal(data.deal);
    setDocuments(data.documents);
    setPrincipals(data.principals);
    setSequence(data.sequence);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!deal) return <p>Deal not found</p>;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Deal info */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{deal.merchant_name}</h2>
            <p className="text-muted-foreground">
              {deal.contact_name} &middot; {deal.contact_email} &middot;{" "}
              {deal.contact_phone}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {DEAL_STATUS_LABELS[deal.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {(() => {
                  const created = new Date(deal.created_at);
                  const now = new Date();
                  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                  if (deal.status === "DOCUMENTS_COMPLETE" || deal.status === "APPROVED") {
                    return `Completed in ${days} day${days !== 1 ? "s" : ""}`;
                  }
                  return `Open for ${days} day${days !== 1 ? "s" : ""}`;
                })()}
              </span>
            </div>
          </div>
          {deal.status !== "DECLINED" && deal.status !== "APPROVED" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={async () => {
                if (!confirm("Archive this deal? It will be set to Declined.")) return;
                await fetch(`/api/deals/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "DECLINED" }),
                });
                loadDeal();
                toast.success("Deal archived");
              }}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Document checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div>
                <span className="font-medium">
                  {DOCUMENT_TYPE_LABELS[doc.type]}
                </span>
                {doc.file_name && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({doc.file_name})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  {statusBadge(doc.status)}
                  {(doc.status === "APPROVED" || doc.status === "REJECTED") && doc.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.status === "APPROVED" ? "Approved" : "Rejected"}
                      {doc.reviewed_by ? ` by ${doc.reviewed_by}` : ""} on{" "}
                      {new Date(doc.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {doc.status === "MISSING" && (
                  <UploadButton dealId={id} docType={doc.type} onDone={loadDeal} />
                )}
                {doc.status === "SUBMITTED" && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch(
                          `/api/deals/${id}/documents`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              document_id: doc.id,
                              status: "APPROVED",
                              reviewed_by: "Admin",
                            }),
                          }
                        );
                        loadDeal();
                        toast.success("Document approved");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await fetch(
                          `/api/deals/${id}/documents`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              document_id: doc.id,
                              status: "REJECTED",
                              reviewed_by: "Admin",
                            }),
                          }
                        );
                        loadDeal();
                        toast.success("Document rejected");
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <NotesSection dealId={id} initialNotes={deal.notes || ""} />

      {/* Follow-up sequence */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-Up Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <FollowUpControls
            dealId={id}
            sequence={sequence}
            deal={deal}
            documents={documents}
            onUpdate={loadDeal}
          />
        </CardContent>
      </Card>

      {/* Principals */}
      <Card>
        <CardHeader>
          <CardTitle>Principals (25%+ Owners)</CardTitle>
        </CardHeader>
        <CardContent>
          <PrincipalSection
            dealId={id}
            merchantName={deal.merchant_name}
            principals={principals}
            onUpdate={loadDeal}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function UploadButton({
  dealId,
  docType,
  onDone,
}: {
  dealId: string;
  docType: string;
  onDone: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("deal_id", dealId);
    formData.append("doc_type", docType);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("File uploaded");
      onDone();
    } else {
      toast.error("Upload failed");
    }
    setUploading(false);
  }

  return (
    <label className="cursor-pointer">
      <input type="file" className="hidden" onChange={handleFile} />
      <Button size="sm" variant="outline" asChild disabled={uploading}>
        <span>{uploading ? "Uploading..." : "Upload"}</span>
      </Button>
    </label>
  );
}

function PrincipalInfoRow({
  label,
  collected,
  value,
  displayValue,
  missing,
  isEditing,
  onEdit,
  onCancel,
  editContent,
  uploadButton,
}: {
  label: string;
  collected: boolean;
  value?: string;
  displayValue?: string;
  missing: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  editContent: React.ReactNode;
  uploadButton?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b pb-2 last:border-0">
      <div className="flex-1">
        <span className="font-medium text-sm">{label}</span>
        {collected && value && (
          <span className="text-sm text-muted-foreground ml-2">
            {displayValue || value}
          </span>
        )}
        {isEditing && <div className="mt-2">{editContent}</div>}
      </div>
      <div className="flex items-center gap-2">
        {collected ? (
          <Badge className="bg-green-100 text-green-800">Collected</Badge>
        ) : (
          <Badge variant="destructive">Missing</Badge>
        )}
        {missing && !isEditing && !uploadButton && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            Enter
          </Button>
        )}
        {missing && uploadButton}
        {isEditing && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function FollowUpControls({
  dealId,
  sequence,
  deal,
  documents,
  onUpdate,
}: {
  dealId: string;
  sequence: FollowUpSequence | null;
  deal: Deal;
  documents: Document[];
  onUpdate: () => void;
}) {
  const [intervalDays, setIntervalDays] = useState("2");
  const [showPreview, setShowPreview] = useState(false);

  const missingDocs = documents.filter((d) => d.status === "MISSING");
  const missingList = missingDocs
    .map((d) => DOCUMENT_TYPE_LABELS[d.type])
    .join(", ");
  const defaultMessage = `Hi ${firstName(deal.contact_name)}, we're still waiting on the following documents for ${deal.merchant_name}: ${missingList || "none currently missing"}. Please submit them at your earliest convenience.`;

  const [message, setMessage] = useState(sequence?.custom_message || defaultMessage);
  const [savingMessage, setSavingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState(false);

  const previewSection = showPreview && (
    <div className="mt-4 space-y-4">
      {/* SMS Preview */}
      <div className="rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#0169B4]">
              SMS Preview
            </span>
            <span className="text-xs text-muted-foreground">
              &mdash; sent to {deal.contact_phone}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingMessage(!editingMessage)}
          >
            {editingMessage ? "Done" : "Edit Message"}
          </Button>
        </div>
        {editingMessage ? (
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMessage(defaultMessage)}
              >
                Reset to Default
              </Button>
              {sequence && (
                <Button
                  size="sm"
                  disabled={savingMessage}
                  onClick={async () => {
                    setSavingMessage(true);
                    await fetch(`/api/deals/${dealId}/follow-ups`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ custom_message: message }),
                    });
                    setSavingMessage(false);
                    setEditingMessage(false);
                    toast.success("Message saved");
                    onUpdate();
                  }}
                >
                  {savingMessage ? "Saving..." : "Save Message"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[#AACBEC] p-3 text-sm max-w-sm whitespace-pre-wrap">
            {message}
          </div>
        )}
      </div>

      {/* Email Preview */}
      <div className="rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#0169B4]">
            Email Preview
          </span>
          <span className="text-xs text-muted-foreground">
            &mdash; sent to {deal.contact_email}
          </span>
        </div>
        <div className="bg-white rounded-lg border border-[#AACBEC] overflow-hidden max-w-md">
          <div className="bg-[#0169B4] px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">P</span>
              </div>
              <span className="text-white text-sm font-semibold tracking-tight">
                POLARIS PAYMENTS
              </span>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-[#0169B4] via-[#00B6ED] to-[#F8AA02]" />
          <div className="px-6 py-5 space-y-4">
            <div className="text-xs text-muted-foreground">
              <strong>Subject:</strong> Documents needed for {deal.merchant_name}
            </div>
            <Separator />
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
            {missingDocs.length > 0 && (
              <div className="bg-[#f7f9fc] rounded-lg p-4 border border-[#d8e3ef]">
                <p className="text-xs font-semibold text-[#0169B4] uppercase tracking-wider mb-2">
                  Missing Documents
                </p>
                <ul className="space-y-1.5">
                  {missingDocs.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F8AA02]" />
                      {DOCUMENT_TYPE_LABELS[d.type]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              If you have any questions, please contact your Polaris Payments representative.
            </p>
          </div>
          <div className="bg-[#f0f4f8] px-6 py-3 border-t border-[#d8e3ef]">
            <p className="text-[10px] text-muted-foreground text-center">
              Polaris Payments &copy; 2026 &middot; All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!sequence) {
    return (
      <div className="space-y-0">
        <div className="flex items-end gap-3">
          <div>
            <Label>Interval</Label>
            <Select value={intervalDays} onValueChange={setIntervalDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    Every {d} day{d > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={async () => {
              await fetch(`/api/deals/${dealId}/follow-ups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  interval_days: Number(intervalDays),
                  custom_message: message !== defaultMessage ? message : null,
                }),
              });
              onUpdate();
              toast.success("Follow-up sequence started");
            }}
          >
            Start Sequence
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Preview Messages"}
          </Button>
        </div>
        {previewSection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={
            sequence.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : sequence.status === "PAUSED"
              ? "bg-yellow-100 text-yellow-800"
              : ""
          }
        >
          {sequence.status}
        </Badge>
        <Select
          value={String(sequence.interval_days)}
          onValueChange={async (val) => {
            await fetch(`/api/deals/${dealId}/follow-ups`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ interval_days: Number(val) }),
            });
            onUpdate();
            toast.success("Frequency updated");
          }}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5, 7].map((d) => (
              <SelectItem key={d} value={String(d)}>
                Every {d} day{d > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sequence.status !== "COMPLETED" && (
          <span className="text-sm text-muted-foreground">
            &middot; Next:{" "}
            {new Date(sequence.next_send_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {sequence.status === "ACTIVE" && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await fetch(`/api/deals/${dealId}/follow-ups`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PAUSED" }),
              });
              onUpdate();
              toast.success("Sequence paused");
            }}
          >
            Pause
          </Button>
        )}
        {sequence.status === "PAUSED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await fetch(`/api/deals/${dealId}/follow-ups`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ACTIVE" }),
              });
              onUpdate();
              toast.success("Sequence resumed");
            }}
          >
            Resume
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Preview Messages"}
        </Button>
      </div>
      {previewSection}

      {/* Message History */}
      {sequence.follow_up_messages && sequence.follow_up_messages.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Message History
          </h3>
          <div className="space-y-2">
            {[...sequence.follow_up_messages]
              .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
              .map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-white"
                >
                  {msg.channel === "SMS" ? (
                    <svg className="w-4 h-4 text-[#0169B4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-[#0169B4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="font-medium text-xs uppercase text-[#0169B4] w-10">
                    {msg.channel}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(msg.sent_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(msg.sent_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrincipalSection({
  dealId,
  merchantName,
  principals,
  onUpdate,
}: {
  dealId: string;
  merchantName: string;
  principals: Principal[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ownershipPct, setOwnershipPct] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingPrincipalId, setEditingPrincipalId] = useState<string | null>(null);
  const [principalMessages, setPrincipalMessages] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<{ principalId: string; field: string } | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [fieldValue2, setFieldValue2] = useState("");
  const [fieldValue3, setFieldValue3] = useState("");
  const [fieldValue4, setFieldValue4] = useState("");
  const [fieldValue5, setFieldValue5] = useState("");

  const previewName = name || "[Principal Name]";
  const previewPhone = phone || "[phone number]";
  const defaultNewMessage = `Hi ${firstName(previewName)}, please submit your information for ${merchantName}.`;
  const [newPrincipalMessage, setNewPrincipalMessage] = useState(defaultNewMessage);
  const [editingNewMessage, setEditingNewMessage] = useState(false);

  function getPrincipalMessage(p: Principal) {
    const defaultMsg = `Hi ${firstName(p.name)}, please submit your information for ${merchantName}.`;
    return principalMessages[p.id] ?? defaultMsg;
  }

  function principalChecklist(p: Principal) {
    const items = [
      { label: "SSN", collected: !!p.ssn_encrypted },
      { label: "Date of Birth", collected: !!p.dob },
      { label: "Address", collected: !!p.address_line1 },
      { label: "Driver's License", collected: !!p.drivers_license_path },
    ];
    return items;
  }

  return (
    <div className="space-y-3">
      {principals.map((p) => {
        const items = principalChecklist(p);
        const collectedCount = items.filter((i) => i.collected).length;
        const allCollected = collectedCount === items.length;
        return (
        <div key={p.id} className="border-b pb-3 last:border-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{p.name}</span>
              {p.ownership_percentage != null && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({p.ownership_percentage}% owner)
                </span>
              )}
              {p.phone && (
                <span className="text-sm text-muted-foreground ml-2">
                  {p.phone}
                </span>
              )}
              {p.email && (
                <span className="text-sm text-muted-foreground ml-2">
                  {p.email}
                </span>
              )}
              {allCollected ? (
                <Badge className="ml-2 bg-green-100 text-green-800">
                  Complete
                </Badge>
              ) : collectedCount > 0 ? (
                <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                  {collectedCount}/{items.length} collected
                </Badge>
              ) : p.submitted_at ? (
                <Badge className="ml-2 bg-green-100 text-green-800">
                  Submitted
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">
                  Pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!p.submitted_at && (p.phone || p.email) && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setPreviewId(previewId === p.id ? null : p.id)
                    }
                  >
                    {previewId === p.id ? "Hide Preview" : "Preview"}
                  </Button>
                  {p.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending === p.id}
                      onClick={async () => {
                        if (!confirm(`Send delegation link to ${p.name} via SMS at ${p.phone}?`)) return;
                        setSending(p.id);
                        const customMsg = principalMessages[p.id];
                        const res = await fetch("/api/delegation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            principal_id: p.id,
                            channel: "sms",
                            ...(customMsg ? { message: customMsg } : {}),
                          }),
                        });
                        if (res.ok) {
                          toast.success("Delegation link sent via SMS");
                        } else {
                          toast.error("Failed to send SMS");
                        }
                        setSending(null);
                      }}
                    >
                      {sending === p.id ? "Sending..." : "Send SMS"}
                    </Button>
                  )}
                  {p.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending === p.id}
                      onClick={async () => {
                        if (!confirm(`Send delegation link to ${p.name} via email at ${p.email}?`)) return;
                        setSending(p.id);
                        const customMsg = principalMessages[p.id];
                        const res = await fetch("/api/delegation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            principal_id: p.id,
                            channel: "email",
                            ...(customMsg ? { message: customMsg } : {}),
                          }),
                        });
                        if (res.ok) {
                          toast.success("Delegation link sent via email");
                        } else {
                          toast.error("Failed to send email");
                        }
                        setSending(null);
                      }}
                    >
                      {sending === p.id ? "Sending..." : "Send Email"}
                    </Button>
                  )}
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  if (!confirm(`Remove ${p.name}?`)) return;
                  await fetch(`/api/deals/${dealId}/principals/${p.id}`, {
                    method: "DELETE",
                  });
                  onUpdate();
                  toast.success("Principal removed");
                }}
              >
                Remove
              </Button>
            </div>
          </div>

          {/* Info rows - document style */}
          <div className="mt-3 space-y-2">
            {/* SSN */}
            <PrincipalInfoRow
              label="SSN"
              collected={!!p.ssn_encrypted}
              value={p.ssn_last4 ? `***-**-${p.ssn_last4}` : undefined}
              missing={!p.ssn_encrypted}
              isEditing={editingField?.principalId === p.id && editingField?.field === "ssn"}
              onEdit={() => {
                setEditingField({ principalId: p.id, field: "ssn" });
                setFieldValue("");
              }}
              onCancel={() => setEditingField(null)}
              editContent={
                <div className="flex items-center gap-2">
                  <SSNInput
                    value={fieldValue}
                    onChange={setFieldValue}
                    className="w-40 h-8 text-sm"
                  />
                  <Button size="sm" onClick={async () => {
                    await fetch(`/api/deals/${dealId}/principals/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ssn: fieldValue }),
                    });
                    setEditingField(null);
                    onUpdate();
                    toast.success("SSN saved");
                  }}>Save</Button>
                </div>
              }
            />

            {/* DOB */}
            <PrincipalInfoRow
              label="Date of Birth"
              collected={!!p.dob}
              value={p.dob ? new Date(p.dob).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : undefined}
              missing={!p.dob}
              isEditing={editingField?.principalId === p.id && editingField?.field === "dob"}
              onEdit={() => {
                setEditingField({ principalId: p.id, field: "dob" });
                setFieldValue(p.dob || "");
              }}
              onCancel={() => setEditingField(null)}
              editContent={
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    className="w-40 h-8 text-sm"
                  />
                  <Button size="sm" onClick={async () => {
                    await fetch(`/api/deals/${dealId}/principals/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dob: fieldValue }),
                    });
                    setEditingField(null);
                    onUpdate();
                    toast.success("Date of birth saved");
                  }}>Save</Button>
                </div>
              }
            />

            {/* Address */}
            <PrincipalInfoRow
              label="Address"
              collected={!!p.address_line1}
              value={p.address_line1 ? `${p.address_line1}${p.address_line2 ? `, ${p.address_line2}` : ""}, ${p.city}, ${p.state} ${p.zip}` : undefined}
              missing={!p.address_line1}
              isEditing={editingField?.principalId === p.id && editingField?.field === "address"}
              onEdit={() => {
                setEditingField({ principalId: p.id, field: "address" });
                setFieldValue(p.address_line1 || "");
                setFieldValue2(p.address_line2 || "");
                setFieldValue3(p.city || "");
                setFieldValue4(p.state || "");
                setFieldValue5(p.zip || "");
              }}
              onCancel={() => setEditingField(null)}
              editContent={
                <div className="space-y-2">
                  <Input placeholder="Street address" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Apt / Suite (optional)" value={fieldValue2} onChange={(e) => setFieldValue2(e.target.value)} className="h-8 text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="City" value={fieldValue3} onChange={(e) => setFieldValue3(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="State" maxLength={2} value={fieldValue4} onChange={(e) => setFieldValue4(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="ZIP" value={fieldValue5} onChange={(e) => setFieldValue5(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={async () => {
                    await fetch(`/api/deals/${dealId}/principals/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        address_line1: fieldValue,
                        address_line2: fieldValue2,
                        city: fieldValue3,
                        state: fieldValue4,
                        zip: fieldValue5,
                      }),
                    });
                    setEditingField(null);
                    onUpdate();
                    toast.success("Address saved");
                  }}>Save</Button>
                </div>
              }
            />

            {/* Driver's License */}
            <PrincipalInfoRow
              label="Driver's License"
              collected={!!p.drivers_license_path}
              value={p.drivers_license_path ? "Uploaded" : undefined}
              missing={!p.drivers_license_path}
              isEditing={false}
              onEdit={() => {}}
              onCancel={() => {}}
              editContent={null}
              uploadButton={!p.drivers_license_path ? (
                <UploadButton dealId={dealId} docType={`PRINCIPAL_DL_${p.id}`} onDone={onUpdate} />
              ) : undefined}
            />

            {/* Ownership Percentage (read-only) */}
            <div className="flex items-start justify-between border-b pb-2 last:border-0">
              <div className="flex-1">
                <span className="font-medium text-sm">Ownership %</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {p.ownership_percentage != null ? `${p.ownership_percentage}%` : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {previewId === p.id && (
            <div className="mt-3 rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#0169B4]">
                  SMS Preview &mdash; to {p.phone}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditingPrincipalId(
                      editingPrincipalId === p.id ? null : p.id
                    )
                  }
                >
                  {editingPrincipalId === p.id ? "Done" : "Edit Message"}
                </Button>
              </div>
              {editingPrincipalId === p.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={getPrincipalMessage(p)}
                    onChange={(e) =>
                      setPrincipalMessages((prev) => ({
                        ...prev,
                        [p.id]: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    A secure link will be appended automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#AACBEC] bg-white p-3">
                  <p className="text-sm whitespace-pre-wrap">
                    {getPrincipalMessage(p)}
                    {"\n\n"}
                    <a
                      href={`/p/preview?name=${encodeURIComponent(p.name)}&merchant=${encodeURIComponent(merchantName)}`}
                      target="_blank"
                      className="text-[#0169B4] underline"
                    >
                      https://polaris-typeform.vercel.app/p/abc123...
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })}

      {principals.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-4">
          No additional owners added. Add a principal if there are owners with 25%+ equity.
        </p>
      )}

      {showForm ? (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full legal name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1..."
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Ownership %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={ownershipPct}
                onChange={(e) => setOwnershipPct(e.target.value)}
                placeholder="25"
                className="w-24"
              />
            </div>
            <Button
              onClick={async () => {
                await fetch(`/api/deals/${dealId}/principals`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    phone,
                    email,
                    ownership_percentage: ownershipPct ? Number(ownershipPct) : null,
                  }),
                });
                setName("");
                setPhone("");
                setEmail("");
                setOwnershipPct("");
                setShowForm(false);
                onUpdate();
                toast.success("Principal added");
              }}
            >
              Add
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>

          {/* SMS Preview */}
          <div className="rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0169B4]">
                SMS Preview &mdash; to {previewPhone}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingNewMessage(!editingNewMessage)}
              >
                {editingNewMessage ? "Done" : "Edit Message"}
              </Button>
            </div>
            {editingNewMessage ? (
              <div className="space-y-2">
                <Textarea
                  value={newPrincipalMessage}
                  onChange={(e) => setNewPrincipalMessage(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  A secure link will be appended automatically.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#AACBEC] bg-white p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {newPrincipalMessage}
                  {"\n\n"}
                  <a
                    href={`/p/preview?name=${encodeURIComponent(name || "Principal")}&merchant=${encodeURIComponent(merchantName)}`}
                    target="_blank"
                    className="text-[#0169B4] underline"
                  >
                    https://polaris-typeform.vercel.app/p/abc123...
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          + Add Principal
        </Button>
      )}
    </div>
  );
}

function NotesSection({
  dealId,
  initialNotes,
}: {
  dealId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this deal..."
        />
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await fetch(`/api/deals/${dealId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ notes }),
            });
            setSaving(false);
            toast.success("Notes saved");
          }}
        >
          {saving ? "Saving..." : "Save Notes"}
        </Button>
      </CardContent>
    </Card>
  );
}
