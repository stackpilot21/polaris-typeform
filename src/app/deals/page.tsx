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

export default function DealsPage() {
  const [deals, setDeals] = useState<
    (Deal & { documents: { status: DocumentStatus }[] })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deals</h2>
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
          {deals.map((deal) => {
            const docs = deal.documents || [];
            const missing = docs.filter((d) => d.status === "MISSING").length;
            const total = docs.length;
            return (
              <TableRow key={deal.id}>
                <TableCell>
                  <a
                    href={`/deals/${deal.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {deal.merchant_name}
                  </a>
                </TableCell>
                <TableCell>
                  <div>{deal.contact_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {deal.contact_email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {DEAL_STATUS_LABELS[deal.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {missing === 0 ? (
                    <Badge className="bg-green-100 text-green-800">
                      All submitted
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
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No deals yet.{" "}
                <a href="/deals/new" className="text-primary hover:underline">
                  Create one
                </a>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
