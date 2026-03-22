"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrincipalSubmissionPage() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<{
    principal_id: string;
    principal_name: string;
    token_id: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/delegation/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid or expired link");
        return r.json();
      })
      .then(setTokenData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Verifying link...</p>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              This link may have expired or already been used. Please contact
              the person who sent it.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  if (submitted)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold text-green-700 mb-2">
              Thank you!
            </h2>
            <p className="text-muted-foreground">
              Your information has been submitted securely. You can close this
              page.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Submit Your Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hi {tokenData?.principal_name}, please fill out the form below. Your
            information is encrypted and stored securely.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const form = new FormData(e.currentTarget);

              // Add file if present
              const fileInput = e.currentTarget.querySelector(
                'input[type="file"]'
              ) as HTMLInputElement;

              const payload = new FormData();
              payload.append("token", token);
              payload.append("token_id", tokenData!.token_id);
              payload.append("principal_id", tokenData!.principal_id);
              payload.append("ssn", form.get("ssn") as string);
              payload.append("dob", form.get("dob") as string);
              payload.append("address_line1", form.get("address_line1") as string);
              payload.append("address_line2", (form.get("address_line2") as string) || "");
              payload.append("city", form.get("city") as string);
              payload.append("state", form.get("state") as string);
              payload.append("zip", form.get("zip") as string);

              if (fileInput?.files?.[0]) {
                payload.append("drivers_license", fileInput.files[0]);
              }

              const res = await fetch("/api/principal-submit", {
                method: "POST",
                body: payload,
              });

              if (res.ok) {
                setSubmitted(true);
              } else {
                alert("Submission failed. Please try again.");
              }
              setSubmitting(false);
            }}
          >
            <div>
              <Label htmlFor="ssn">Social Security Number</Label>
              <Input
                id="ssn"
                name="ssn"
                type="password"
                placeholder="XXX-XX-XXXX"
                required
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" required />
            </div>
            <div>
              <Label htmlFor="address_line1">Street Address</Label>
              <Input id="address_line1" name="address_line1" required />
            </div>
            <div>
              <Label htmlFor="address_line2">Apt / Suite (optional)</Label>
              <Input id="address_line2" name="address_line2" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" maxLength={2} required />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" name="zip" required />
              </div>
            </div>
            <div>
              <Label htmlFor="drivers_license">Driver&apos;s License (photo)</Label>
              <Input
                id="drivers_license"
                name="drivers_license"
                type="file"
                accept="image/*,.pdf"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Securely"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
