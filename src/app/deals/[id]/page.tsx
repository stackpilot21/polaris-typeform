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
import { toast } from "sonner";

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
        <h2 className="text-2xl font-bold">{deal.merchant_name}</h2>
        <p className="text-muted-foreground">
          {deal.contact_name} &middot; {deal.contact_email} &middot;{" "}
          {deal.contact_phone}
        </p>
        <Badge variant="outline" className="mt-1">
          {DEAL_STATUS_LABELS[deal.status]}
        </Badge>
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
                {statusBadge(doc.status)}
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

      {/* Follow-up sequence */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-Up Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <FollowUpControls
            dealId={id}
            sequence={sequence}
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

function FollowUpControls({
  dealId,
  sequence,
  onUpdate,
}: {
  dealId: string;
  sequence: FollowUpSequence | null;
  onUpdate: () => void;
}) {
  const [intervalDays, setIntervalDays] = useState("2");

  if (!sequence) {
    return (
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
              body: JSON.stringify({ interval_days: Number(intervalDays) }),
            });
            onUpdate();
            toast.success("Follow-up sequence started");
          }}
        >
          Start Sequence
        </Button>
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
        <span className="text-sm text-muted-foreground">
          Every {sequence.interval_days} day
          {sequence.interval_days > 1 ? "s" : ""}
        </span>
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
      </div>
    </div>
  );
}

function PrincipalSection({
  dealId,
  principals,
  onUpdate,
}: {
  dealId: string;
  principals: Principal[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {principals.map((p) => (
        <div key={p.id} className="flex items-center justify-between border-b pb-2">
          <div>
            <span className="font-medium">{p.name}</span>
            {p.phone && (
              <span className="text-sm text-muted-foreground ml-2">
                {p.phone}
              </span>
            )}
            {p.submitted_at ? (
              <Badge className="ml-2 bg-green-100 text-green-800">
                Submitted
              </Badge>
            ) : (
              <Badge variant="destructive" className="ml-2">
                Pending
              </Badge>
            )}
          </div>
          {!p.submitted_at && p.phone && (
            <Button
              size="sm"
              variant="outline"
              disabled={sending === p.id}
              onClick={async () => {
                setSending(p.id);
                const res = await fetch("/api/delegation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ principal_id: p.id }),
                });
                if (res.ok) {
                  toast.success("Delegation link sent via SMS");
                } else {
                  toast.error("Failed to send link");
                }
                setSending(null);
              }}
            >
              {sending === p.id ? "Sending..." : "Send Link"}
            </Button>
          )}
        </div>
      ))}

      {showForm ? (
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
          <Button
            onClick={async () => {
              await fetch(`/api/deals/${dealId}/principals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone }),
              });
              setName("");
              setPhone("");
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
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          + Add Principal
        </Button>
      )}
    </div>
  );
}
