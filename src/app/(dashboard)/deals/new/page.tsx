"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const merchantName = form.get("merchant_name") as string;

    // Duplicate deal detection
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
            setLoading(false);
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
        contact_name: form.get("contact_name"),
        contact_email: form.get("contact_email"),
        contact_phone: form.get("contact_phone"),
        notes: form.get("notes") || null,
      }),
    });

    if (res.ok) {
      const deal = await res.json();
      router.push(`/deals/${deal.id}`);
    } else {
      setLoading(false);
      alert("Failed to create deal");
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold mb-4">New Deal</h2>
      <Card>
        <CardHeader>
          <CardTitle>Merchant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="merchant_name">Business Name</Label>
              <Input id="merchant_name" name="merchant_name" required />
            </div>
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" name="contact_name" required />
            </div>
            <div>
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Deal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
