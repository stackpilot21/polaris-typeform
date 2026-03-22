"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal, DocumentStatus, DealStatus, FollowUpSequence, FollowUpMessage, SequenceStatus } from "@/types";

type DealWithDocs = Deal & { documents: { status: DocumentStatus }[] };

interface DashboardData {
  deals: DealWithDocs[];
  sequences: (FollowUpSequence & { follow_up_messages?: FollowUpMessage[]; deal_id: string })[];
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealWithDocs[]>([]);
  const [sequences, setSequences] = useState<DashboardData["sequences"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/dashboard/sequences").then((r) => r.json()).catch(() => []),
    ]).then(([dealsData, seqData]) => {
      setDeals(dealsData);
      setSequences(seqData);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );

  const totalDeals = deals.length;
  const dealsWithMissingDocs = deals.filter((d) =>
    (d.documents || []).some((doc) => doc.status === "MISSING")
  );
  const dealsAllComplete = deals.filter((d) =>
    (d.documents || []).length > 0 && (d.documents || []).every((doc) => doc.status !== "MISSING")
  );

  const activeSeq = sequences.filter((s) => s.status === "ACTIVE").length;
  const pausedSeq = sequences.filter((s) => s.status === "PAUSED").length;
  const completedSeq = sequences.filter((s) => s.status === "COMPLETED").length;

  // Recent follow-up messages across all sequences
  const allMessages = sequences.flatMap((s) =>
    (s.follow_up_messages || []).map((m) => ({ ...m, deal_id: s.deal_id }))
  );
  const recentMessages = allMessages
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    .slice(0, 5);

  // Deals needing attention: missing docs AND no active follow-up
  const activeDealIds = new Set(
    sequences.filter((s) => s.status === "ACTIVE").map((s) => s.deal_id)
  );
  const needsAttention = dealsWithMissingDocs.filter(
    (d) => !activeDealIds.has(d.id) && d.status !== "APPROVED" && d.status !== "DECLINED"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your deals and follow-ups</p>
      </div>

      {/* Deal Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold">{totalDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Missing Docs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-destructive">{dealsWithMissingDocs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Docs Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-green-600">{dealsAllComplete.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sequences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-green-600">{activeSeq}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paused Sequences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-yellow-600">{pausedSeq}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Sequences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold">{completedSeq}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Follow-Up Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No follow-up messages sent yet.</p>
          ) : (
            <div className="space-y-2">
              {recentMessages.map((msg) => {
                const deal = deals.find((d) => d.id === msg.deal_id);
                return (
                  <div key={msg.id} className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-white">
                    <Badge variant="outline" className="text-xs">{msg.channel}</Badge>
                    <span className="font-medium">{deal?.merchant_name || "Unknown"}</span>
                    <span className="text-muted-foreground text-xs ml-auto">
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals Needing Attention */}
      <Card>
        <CardHeader>
          <CardTitle>Deals Needing Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">All deals with missing docs have active follow-ups.</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((deal) => {
                const missing = (deal.documents || []).filter((d) => d.status === "MISSING").length;
                return (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white cursor-pointer hover:bg-muted/50"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    <span className="font-medium">{deal.merchant_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{missing} missing doc{missing !== 1 ? "s" : ""}</Badge>
                      <Badge variant="outline" className="text-yellow-700">No active follow-up</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
