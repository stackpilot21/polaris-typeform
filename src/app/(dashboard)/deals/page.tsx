"use client";

import { useEffect, useState } from "react";
import { Deal, DocumentStatus, DEAL_STATUS_LABELS } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DealsPage() {
  const [deals, setDeals] = useState<
    (Deal & { documents: { status: DocumentStatus }[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function loadDeals() {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDeals();
  }, []);

  async function archiveDeal(id: string) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DECLINED" }),
    });
  }

  async function archiveSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Archive ${selected.size} deal${selected.size > 1 ? "s" : ""}?`)) return;
    await Promise.all(Array.from(selected).map(archiveDeal));
    setSelected(new Set());
    loadDeals();
    toast.success(`${selected.size} deal${selected.size > 1 ? "s" : ""} archived`);
  }

  async function archiveSingle(id: string, name: string) {
    if (!confirm(`Archive "${name}"?`)) return;
    await archiveDeal(id);
    loadDeals();
    toast.success("Deal archived");
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading deals...</p>
      </div>
    );

  const activeDeals = deals.filter(d => d.status !== "DECLINED" && d.status !== "APPROVED");
  const totalDeals = activeDeals.length;
  const pendingDocs = activeDeals.filter((d) =>
    (d.documents || []).some((doc) => doc.status === "MISSING")
  ).length;
  const complete = activeDeals.filter(
    (d) => (d.documents || []).every((doc) => doc.status !== "MISSING")
  ).length;

  const filteredDeals = deals.filter((deal) => {
    if (!showArchived && (deal.status === "APPROVED" || deal.status === "DECLINED")) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      deal.merchant_name.toLowerCase().includes(q) ||
      deal.contact_name.toLowerCase().includes(q) ||
      DEAL_STATUS_LABELS[deal.status].toLowerCase().includes(q)
    );
  });

  const allVisibleIds = filteredDeals.filter(d => d.status !== "DECLINED" && d.status !== "APPROVED").map(d => d.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allVisibleIds));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Deals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage merchant applications and document collection
          </p>
        </div>
        <Button asChild>
          <a href="/deals/new">+ New Deal</a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold">{totalDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-destructive">
              {pendingDocs}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docs Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-green-600">
              {complete}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by merchant, contact, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show archived
        </label>
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={archiveSelected}
            className="ml-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive {selected.size} selected
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeals.map((deal) => {
              const docs = deal.documents || [];
              const missing = docs.filter(
                (d) => d.status === "MISSING"
              ).length;
              const total = docs.length;
              const isArchived = deal.status === "DECLINED" || deal.status === "APPROVED";
              return (
                <TableRow
                  key={deal.id}
                  className={`hover:bg-muted/50 ${isArchived ? "opacity-50" : ""}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {!isArchived && (
                      <input
                        type="checkbox"
                        checked={selected.has(deal.id)}
                        onChange={() => toggleSelect(deal.id)}
                        className="rounded border-gray-300"
                      />
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    <span className="font-semibold text-foreground">
                      {deal.merchant_name}
                    </span>
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    <div className="text-sm">{deal.contact_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {deal.contact_email}
                    </div>
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    <Badge variant="outline" className="font-medium">
                      {DEAL_STATUS_LABELS[deal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    {missing === 0 ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 border">
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {missing}/{total} missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={() => (window.location.href = `/deals/${deal.id}`)}
                  >
                    {new Date(deal.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {!isArchived && (
                      <button
                        onClick={() => archiveSingle(deal.id, deal.merchant_name)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        title="Archive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredDeals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  No deals found.{" "}
                  <a
                    href="/deals/new"
                    className="text-[#0169B4] font-medium hover:underline"
                  >
                    Create your first deal
                  </a>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
