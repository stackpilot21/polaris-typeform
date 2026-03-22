"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Deal, Document, Principal, FollowUpSequence, FollowUpMessage, DOCUMENT_TYPE_LABELS, DEAL_STATUS_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
    <div className="flex gap-6">
      {/* Left column: main content */}
      <div className="flex-1 min-w-0 max-w-3xl space-y-6">
      {/* Deal header */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#0169B4] via-[#00B6ED] to-[#F8AA02]" />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold text-[#1a1a2e]">{deal.merchant_name}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {deal.contact_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {deal.contact_email}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {deal.contact_phone}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="font-medium">
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
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
                className="text-muted-foreground"
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
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
            {(() => {
              const submitted = documents.filter((d) => d.status !== "MISSING").length;
              const total = documents.length;
              const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{submitted}/{total} received</span>
                  <div className="w-24 h-2 rounded-full bg-[#f0f4f8]">
                    <div className="h-2 rounded-full bg-[#0169B4] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => {
              const isMissing = doc.status === "MISSING";
              const isSubmitted = doc.status === "SUBMITTED";
              const isApproved = doc.status === "APPROVED";
              const isRejected = doc.status === "REJECTED";
              return (
                <div
                  key={doc.id}
                  className={`rounded-lg p-4 flex items-center justify-between ${
                    isMissing
                      ? "border-2 border-dashed border-[#d8e3ef] bg-white"
                      : "bg-[#f7f9fc] border border-[#d8e3ef]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    {isApproved ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    ) : isRejected ? (
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    ) : isSubmitted ? (
                      <div className="w-8 h-8 rounded-full bg-[#FDC302]/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#F8AA02]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#d8e3ef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-sm">{doc.custom_name || DOCUMENT_TYPE_LABELS[doc.type]}</span>
                      {doc.file_name && (
                        <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                      )}
                      {(isApproved || isRejected) && doc.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          {isApproved ? "Approved" : "Rejected"}
                          {doc.reviewed_by ? ` by ${doc.reviewed_by}` : ""} &middot;{" "}
                          {new Date(doc.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                      {isMissing && (
                        <p className="text-xs text-muted-foreground/50 italic">Not yet received</p>
                      )}
                      {isSubmitted && (
                        <p className="text-xs text-[#F8AA02]">Awaiting review</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMissing && (
                      <UploadButton dealId={id} docType={doc.type} onDone={loadDeal} />
                    )}
                    {isSubmitted && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                          onClick={async () => {
                            await fetch(`/api/deals/${id}/documents`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ document_id: doc.id, status: "APPROVED", reviewed_by: "Admin" }),
                            });
                            loadDeal();
                            toast.success("Document approved");
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 text-destructive border-destructive/30"
                          onClick={async () => {
                            await fetch(`/api/deals/${id}/documents`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ document_id: doc.id, status: "REJECTED", reviewed_by: "Admin" }),
                            });
                            loadDeal();
                            toast.success("Document rejected");
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <AddDocumentButton dealId={id} onDone={loadDeal} />
        </CardContent>
      </Card>

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
          <CardTitle>Additional Principals</CardTitle>
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

      {/* Notes */}
      <NotesSection dealId={id} initialNotes={deal.notes || ""} />
      </div>

      {/* Right column: Activity panel (desktop) */}
      <div className="hidden lg:block w-[350px] shrink-0">
        <div className="sticky top-6">
          <ActivityPanel
            dealId={id}
            contactPhone={deal.contact_phone}
            contactEmail={deal.contact_email}
            followUpMessages={sequence?.follow_up_messages || []}
          />
        </div>
      </div>

      {/* Mobile floating button + slide-over */}
      <MobileActivityPanel
        dealId={id}
        contactPhone={deal.contact_phone}
        contactEmail={deal.contact_email}
        followUpMessages={sequence?.follow_up_messages || []}
      />
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
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.value = "";
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("deal_id", dealId);
    formData.append("doc_type", docType);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("File uploaded");
      setOpen(false);
      setSelectedFile(null);
      onDone();
    } else {
      toast.error("Upload failed");
    }
    setUploading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedFile(null); setDragging(false); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Upload</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragging ? "border-[#0169B4] bg-[#0169B4]/5" : "border-gray-300"
          }`}
        >
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {dragging ? (
            <p className="text-sm font-medium text-[#0169B4]">Drop file here</p>
          ) : selectedFile ? (
            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Drag and drop a file here, or</p>
          )}
          {!dragging && (
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileSelect} ref={fileInputRef} />
              <Button size="sm" variant="outline" asChild>
                <span>Browse files</span>
              </Button>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    .map((d) => d.custom_name || DOCUMENT_TYPE_LABELS[d.type])
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
                      {d.custom_name || DOCUMENT_TYPE_LABELS[d.type]}
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
  const [editModalId, setEditModalId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
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

  function sendDelegation(p: Principal, channel: "sms" | "email") {
    const target = channel === "sms" ? p.phone : p.email;
    if (!confirm(`Send delegation link to ${firstName(p.name)} via ${channel.toUpperCase()} at ${target}?`)) return;
    setSending(p.id);
    const customMsg = principalMessages[p.id];
    fetch("/api/delegation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        principal_id: p.id,
        channel,
        ...(customMsg ? { message: customMsg } : {}),
      }),
    }).then((res) => {
      if (res.ok) toast.success(`Link sent via ${channel.toUpperCase()}`);
      else toast.error(`Failed to send ${channel.toUpperCase()}`);
      setSending(null);
      setActionMenuId(null);
    });
  }

  return (
    <div className="space-y-3">
      {principals.map((p) => {
        const items = principalChecklist(p);
        const collectedCount = items.filter((i) => i.collected).length;
        const total = items.length;
        const allCollected = collectedCount === total;
        const isExpanded = expandedId === p.id;
        const pct = Math.round((collectedCount / total) * 100);

        // Progress ring
        const ringSize = 36;
        const strokeWidth = 3;
        const radius = (ringSize - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const dashOffset = circumference - (pct / 100) * circumference;
        const ringColor = allCollected ? "#22c55e" : collectedCount > 0 ? "#F8AA02" : "#d8e3ef";

        return (
        <div key={p.id} className="rounded-lg border border-[#d8e3ef] bg-white overflow-hidden">
          {/* Clickable header — collapsed by default */}
          <button
            className="w-full text-left p-4 flex items-center gap-4 hover:bg-[#f7f9fc]/50 transition-colors"
            onClick={() => setExpandedId(isExpanded ? null : p.id)}
          >
            {/* Progress ring */}
            <div className="relative shrink-0">
              <svg width={ringSize} height={ringSize} className="-rotate-90">
                <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke="#f0f4f8" strokeWidth={strokeWidth} />
                <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke={ringColor} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {collectedCount}/{total}
              </span>
            </div>

            {/* Name + contact */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{p.name}</span>
                {p.ownership_percentage != null && (
                  <span className="text-xs text-[#0169B4] font-medium">{p.ownership_percentage}%</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {p.phone && <span>{p.phone}</span>}
                {p.phone && p.email && <span>&middot;</span>}
                {p.email && <span className="truncate">{p.email}</span>}
              </div>
            </div>

            {/* Actions (stop propagation so clicks don't toggle expand) */}
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {!allCollected && (p.phone || p.email) && (
                <div className="relative">
                  <Button
                    size="sm"
                    className="bg-[#0169B4] hover:bg-[#015a9a] text-white text-xs"
                    disabled={sending === p.id}
                    onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                  >
                    {sending === p.id ? "Sending..." : "Request Info"}
                  </Button>
                  {actionMenuId === p.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-[#d8e3ef] shadow-lg py-1 min-w-[160px]">
                        {p.phone && (
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#f7f9fc] flex items-center gap-2" onClick={() => sendDelegation(p, "sms")}>
                            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            Send SMS
                          </button>
                        )}
                        {p.email && (
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#f7f9fc] flex items-center gap-2" onClick={() => sendDelegation(p, "email")}>
                            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Send Email
                          </button>
                        )}
                        <div className="border-t border-[#d8e3ef] my-1" />
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#f7f9fc] flex items-center gap-2" onClick={() => { setActionMenuId(null); setPreviewId(previewId === p.id ? null : p.id); setExpandedId(p.id); }}>
                          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Preview Message
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setEditModalId(editModalId === p.id ? null : p.id)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </Button>
            </div>

            {/* Expand chevron */}
            <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Edit dropdown */}
          {editModalId === p.id && (
            <div className="mx-4 mb-3 rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-3">
              <h4 className="text-sm font-semibold">Edit Principal</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Name</Label><p>{p.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{p.phone || "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Email</Label><p>{p.email || "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Ownership</Label><p>{p.ownership_percentage != null ? `${p.ownership_percentage}%` : "—"}</p></div>
              </div>
              <Separator />
              <Button size="sm" variant="destructive" onClick={async () => {
                if (!confirm(`Remove ${p.name}? This cannot be undone.`)) return;
                await fetch(`/api/deals/${dealId}/principals/${p.id}`, { method: "DELETE" });
                setEditModalId(null);
                onUpdate();
                toast.success("Principal removed");
              }}>
                Remove Principal
              </Button>
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-4 pb-4">
              {/* 2x2 info grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* SSN */}
                <div
                  className={`rounded-lg p-3 ${p.ssn_encrypted ? "bg-[#f7f9fc] border border-[#d8e3ef]" : "border-2 border-dashed border-[#d8e3ef] bg-white"}`}
                  onClick={() => { if (!p.ssn_encrypted) { setEditingField({ principalId: p.id, field: "ssn" }); setFieldValue(""); } }}
                  role={!p.ssn_encrypted ? "button" : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {p.ssn_encrypted ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-[#d8e3ef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                    )}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SSN</span>
                  </div>
                  {editingField?.principalId === p.id && editingField?.field === "ssn" ? (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <SSNInput value={fieldValue} onChange={setFieldValue} className="h-7 text-sm flex-1" />
                      <Button size="sm" className="h-7 text-xs" onClick={async () => {
                        await fetch(`/api/deals/${dealId}/principals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ssn: fieldValue }) });
                        setEditingField(null); onUpdate(); toast.success("SSN saved");
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditingField(null); }}>Cancel</Button>
                    </div>
                  ) : (
                    <p className={`text-sm ${p.ssn_encrypted ? "font-medium" : "text-muted-foreground/50 italic"}`}>
                      {p.ssn_last4 ? `***-**-${p.ssn_last4}` : "Click to enter"}
                    </p>
                  )}
                </div>

                {/* DOB */}
                <div
                  className={`rounded-lg p-3 ${p.dob ? "bg-[#f7f9fc] border border-[#d8e3ef]" : "border-2 border-dashed border-[#d8e3ef] bg-white"}`}
                  onClick={() => { if (!p.dob) { setEditingField({ principalId: p.id, field: "dob" }); setFieldValue(""); } }}
                  role={!p.dob ? "button" : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {p.dob ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-[#d8e3ef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                    )}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</span>
                  </div>
                  {editingField?.principalId === p.id && editingField?.field === "dob" ? (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <Input type="date" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className="h-7 text-sm flex-1" />
                      <Button size="sm" className="h-7 text-xs" onClick={async () => {
                        await fetch(`/api/deals/${dealId}/principals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dob: fieldValue }) });
                        setEditingField(null); onUpdate(); toast.success("DOB saved");
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditingField(null); }}>Cancel</Button>
                    </div>
                  ) : (
                    <p className={`text-sm ${p.dob ? "font-medium" : "text-muted-foreground/50 italic"}`}>
                      {p.dob ? new Date(p.dob).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "Click to enter"}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div
                  className={`rounded-lg p-3 ${p.address_line1 ? "bg-[#f7f9fc] border border-[#d8e3ef]" : "border-2 border-dashed border-[#d8e3ef] bg-white"}`}
                  onClick={() => { if (!p.address_line1) { setEditingField({ principalId: p.id, field: "address" }); setFieldValue(""); setFieldValue2(""); setFieldValue3(""); setFieldValue4(""); setFieldValue5(""); } }}
                  role={!p.address_line1 ? "button" : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {p.address_line1 ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-[#d8e3ef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                    )}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</span>
                  </div>
                  {editingField?.principalId === p.id && editingField?.field === "address" ? (
                    <div className="space-y-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                      <Input placeholder="Street" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className="h-7 text-sm" />
                      <Input placeholder="Apt (optional)" value={fieldValue2} onChange={(e) => setFieldValue2(e.target.value)} className="h-7 text-sm" />
                      <div className="grid grid-cols-3 gap-1.5">
                        <Input placeholder="City" value={fieldValue3} onChange={(e) => setFieldValue3(e.target.value)} className="h-7 text-sm" />
                        <Input placeholder="ST" maxLength={2} value={fieldValue4} onChange={(e) => setFieldValue4(e.target.value)} className="h-7 text-sm" />
                        <Input placeholder="ZIP" value={fieldValue5} onChange={(e) => setFieldValue5(e.target.value)} className="h-7 text-sm" />
                      </div>
                      <Button size="sm" className="h-7 text-xs" onClick={async () => {
                        await fetch(`/api/deals/${dealId}/principals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address_line1: fieldValue, address_line2: fieldValue2, city: fieldValue3, state: fieldValue4, zip: fieldValue5 }) });
                        setEditingField(null); onUpdate(); toast.success("Address saved");
                      }}>Save</Button>
                    </div>
                  ) : (
                    <p className={`text-sm ${p.address_line1 ? "font-medium" : "text-muted-foreground/50 italic"}`}>
                      {p.address_line1 ? `${p.address_line1}, ${p.city}, ${p.state} ${p.zip}` : "Click to enter"}
                    </p>
                  )}
                </div>

                {/* Driver's License */}
                <div className={`rounded-lg p-3 ${p.drivers_license_path ? "bg-[#f7f9fc] border border-[#d8e3ef]" : "border-2 border-dashed border-[#d8e3ef] bg-white"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {p.drivers_license_path ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-[#d8e3ef]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                    )}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Driver&apos;s License</span>
                  </div>
                  {p.drivers_license_path ? (
                    <p className="text-sm font-medium">Uploaded</p>
                  ) : (
                    <UploadButton dealId={dealId} docType={`PRINCIPAL_DL_${p.id}`} onDone={onUpdate} />
                  )}
                </div>
              </div>

              {/* Message preview */}
              {previewId === p.id && (
                <div className="mt-4 rounded-lg border border-[#d8e3ef] bg-[#f7f9fc] p-4 space-y-3">
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

interface DealMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: "SMS" | "EMAIL";
  body: string;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  type: "message" | "follow_up";
  direction?: "INBOUND" | "OUTBOUND";
  channel: "SMS" | "EMAIL";
  body: string;
  date: string;
}

function AddDocumentButton({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!customName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/deals/${dealId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CUSTOM", custom_name: customName.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Document added");
      setCustomName("");
      setShowForm(false);
      onDone();
    } else {
      toast.error("Failed to add document");
    }
  }

  if (!showForm) {
    return (
      <Button variant="outline" className="mt-3 w-full border-dashed" onClick={() => setShowForm(true)}>
        + Add Document
      </Button>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Input
        value={customName}
        onChange={(e) => setCustomName(e.target.value)}
        placeholder="Document name (e.g. 3 Months Bank Statements)"
        className="flex-1"
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        autoFocus
      />
      <Button size="sm" onClick={handleAdd} disabled={saving || !customName.trim()}>
        {saving ? "Adding..." : "Add"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCustomName(""); }}>
        Cancel
      </Button>
    </div>
  );
}

function ActivityPanelContent({
  dealId,
  contactPhone,
  contactEmail,
  followUpMessages,
}: {
  dealId: string;
  contactPhone: string;
  contactEmail: string;
  followUpMessages: FollowUpMessage[];
}) {
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyChannel, setReplyChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?deal_id=${dealId}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [dealId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Merge messages and follow-up messages into a single timeline
  const entries: ActivityEntry[] = [
    ...messages.map((m) => ({
      id: m.id,
      type: "message" as const,
      direction: m.direction,
      channel: m.channel,
      body: m.body,
      date: m.created_at,
    })),
    ...followUpMessages.map((f) => ({
      id: f.id,
      type: "follow_up" as const,
      channel: f.channel,
      body: f.content,
      date: f.sent_at,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  async function handleQuickReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    const to = replyChannel === "SMS" ? contactPhone : contactEmail;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: dealId,
        channel: replyChannel,
        body: replyBody,
        to,
      }),
    });
    setReplyBody("");
    setSending(false);
    toast.success("Message sent");
    loadMessages();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#d8e3ef]">
        <h3 className="font-heading font-semibold text-sm text-[#1a1a2e]">Activity</h3>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
        )}
        {entries.map((entry) => {
          const isOutbound = entry.direction === "OUTBOUND" || entry.type === "follow_up";
          const isSMS = entry.channel === "SMS";
          const date = new Date(entry.date);
          return (
            <div key={entry.id} className="flex items-start gap-2.5">
              {/* Icon */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                entry.type === "follow_up" ? "bg-[#FDC302]/20" : isOutbound ? "bg-[#0169B4]/10" : "bg-gray-100"
              }`}>
                {isSMS ? (
                  <svg className="w-3.5 h-3.5 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isOutbound ? (
                    <svg className="w-3 h-3 text-[#0169B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  ) : (
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  )}
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.type === "follow_up" ? "Follow-up" : isOutbound ? "Sent" : "Received"} &middot; {entry.channel}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-snug line-clamp-3">{entry.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at{" "}
                  {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick reply */}
      <div className="border-t border-[#d8e3ef] px-4 py-3 space-y-2">
        <div className="flex gap-1">
          <button
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              replyChannel === "SMS"
                ? "bg-[#0169B4] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setReplyChannel("SMS")}
          >
            SMS
          </button>
          <button
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              replyChannel === "EMAIL"
                ? "bg-[#0169B4] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setReplyChannel("EMAIL")}
          >
            Email
          </button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={`Quick ${replyChannel} reply...`}
            className="resize-none text-sm"
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuickReply(); } }}
          />
          <Button
            onClick={handleQuickReply}
            disabled={sending || !replyBody.trim()}
            className="bg-[#0169B4] hover:bg-[#015a9a] self-end"
            size="sm"
          >
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityPanel(props: {
  dealId: string;
  contactPhone: string;
  contactEmail: string;
  followUpMessages: FollowUpMessage[];
}) {
  return (
    <Card className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      <ActivityPanelContent {...props} />
    </Card>
  );
}

function MobileActivityPanel(props: {
  dealId: string;
  contactPhone: string;
  contactEmail: string;
  followUpMessages: FollowUpMessage[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button - visible only on mobile */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#0169B4] text-white shadow-lg flex items-center justify-center hover:bg-[#015a9a] transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open activity panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Slide-over backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-[350px] max-w-full bg-white h-full shadow-xl flex flex-col">
            <button
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ActivityPanelContent {...props} />
          </div>
        </div>
      )}
    </>
  );
}
