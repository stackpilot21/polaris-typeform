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

export default function DealsPage() {
  const [deals, setDeals] = useState<
    (Deal & { documents: { status: DocumentStatus }[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading deals...</p>
      </div>
    );

  const totalDeals = deals.length;
  const pendingDocs = deals.filter((d) =>
    (d.documents || []).some((doc) => doc.status === "MISSING")
  ).length;
  const complete = deals.filter(
    (d) => (d.documents || []).every((doc) => doc.status !== "MISSING")
  ).length;

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
              Total Deals
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

      {/* Search */}
      <Input
        placeholder="Search by merchant, contact, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.filter((deal) => {
              if (!search.trim()) return true;
              const q = search.toLowerCase();
              return (
                deal.merchant_name.toLowerCase().includes(q) ||
                deal.contact_name.toLowerCase().includes(q) ||
                DEAL_STATUS_LABELS[deal.status].toLowerCase().includes(q)
              );
            }).map((deal) => {
              const docs = deal.documents || [];
              const missing = docs.filter(
                (d) => d.status === "MISSING"
              ).length;
              const total = docs.length;
              return (
                <TableRow
                  key={deal.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/deals/${deal.id}`)
                  }
                >
                  <TableCell>
                    <span className="font-semibold text-foreground">
                      {deal.merchant_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{deal.contact_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {deal.contact_email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {DEAL_STATUS_LABELS[deal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(deal.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
            {deals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  No deals yet.{" "}
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
