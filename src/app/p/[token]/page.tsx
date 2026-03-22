"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SSNInput } from "@/components/ssn-input";

function PolarisHeader() {
  return (
    <>
      <div className="bg-[#0169B4]">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="text-white font-heading font-semibold tracking-tight text-sm">
            POLARIS PAYMENTS
          </span>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-[#0169B4] via-[#00B6ED] to-[#F8AA02]" />
    </>
  );
}

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-[#4d4d4d] mb-1.5">
        <span>{filled} of {total} fields completed</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#d8e3ef]">
        <div
          className="h-2 rounded-full bg-[#0169B4] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
  const [ssn, setSSN] = useState("");
  const [dob, setDob] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dlFileName, setDlFileName] = useState("");

  // Count filled fields for progress bar
  const filledCount = [
    ssn.replace(/[^0-9]/g, "").length === 9,
    dob.length > 0,
    addressLine1.length > 0,
    city.length > 0,
    state.length > 0,
    zip.length > 0,
    dlFileName.length > 0,
  ].filter(Boolean).length;
  const totalFields = 7;

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#4d4d4d]">Verifying link...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-white">
        <PolarisHeader />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-bold text-[#1a1a2e] mb-2">Link Expired</h2>
          <p className="text-[#4d4d4d] text-sm">
            This link may have expired or already been used. Please contact the person who sent it to request a new one.
          </p>
        </div>
      </div>
    );

  if (submitted)
    return (
      <div className="min-h-screen bg-white">
        <PolarisHeader />
        <div className="max-w-md mx-auto px-6 py-20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-heading font-bold text-[#1a1a2e] mb-2">Thank You!</h2>
            <p className="text-[#4d4d4d] text-sm">
              Your information has been submitted securely. You can close this page.
            </p>
          </div>

          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">Submission Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#4d4d4d]">SSN</span>
                <span className="font-medium">***-**-{ssn.replace(/[^0-9]/g, "").slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4d4d4d]">Date of Birth</span>
                <span className="font-medium">{dob}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4d4d4d]">Address</span>
                <span className="font-medium text-right">{addressLine1}, {city}, {state} {zip}</span>
              </div>
              {dlFileName && (
                <div className="flex justify-between">
                  <span className="text-[#4d4d4d]">Driver&apos;s License</span>
                  <span className="font-medium">{dlFileName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-white">
      <PolarisHeader />

      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold text-[#1a1a2e] mb-2">
            Submit Your Information
          </h1>
          <p className="text-[#4d4d4d] text-sm leading-relaxed">
            Hi {tokenData?.principal_name}, please fill out the form below. Your
            information is encrypted and stored securely.
          </p>
        </div>

        <ProgressBar filled={filledCount} total={totalFields} />

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            const form = new FormData(e.currentTarget);

            const fileInput = e.currentTarget.querySelector(
              'input[type="file"]'
            ) as HTMLInputElement;

            const payload = new FormData();
            payload.append("token", token);
            payload.append("token_id", tokenData!.token_id);
            payload.append("principal_id", tokenData!.principal_id);
            payload.append("ssn", ssn);
            payload.append("dob", dob);
            payload.append("address_line1", addressLine1);
            payload.append("address_line2", (form.get("address_line2") as string) || "");
            payload.append("city", city);
            payload.append("state", state);
            payload.append("zip", zip);

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
          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">
              Personal Information
            </h2>
            <div>
              <Label htmlFor="ssn" className="text-[#4d4d4d] text-sm">Social Security Number</Label>
              <SSNInput id="ssn" value={ssn} onChange={setSSN} required className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]" />
            </div>
            <div>
              <Label htmlFor="dob" className="text-[#4d4d4d] text-sm">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]" />
            </div>
          </div>

          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">
              Residential Address
            </h2>
            <div>
              <Label htmlFor="address_line1" className="text-[#4d4d4d] text-sm">Street Address</Label>
              <Input id="address_line1" name="address_line1" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
            </div>
            <div>
              <Label htmlFor="address_line2" className="text-[#4d4d4d] text-sm">Apt / Suite (optional)</Label>
              <Input id="address_line2" name="address_line2" className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="city" className="text-[#4d4d4d] text-sm">City</Label>
                <Input id="city" name="city" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
              </div>
              <div>
                <Label htmlFor="state" className="text-[#4d4d4d] text-sm">State</Label>
                <Input id="state" name="state" maxLength={2} required value={state} onChange={(e) => setState(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
              </div>
              <div>
                <Label htmlFor="zip" className="text-[#4d4d4d] text-sm">ZIP</Label>
                <Input id="zip" name="zip" required value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">
              Driver&apos;s License
            </h2>
            <p className="text-[#4d4d4d] text-xs">
              Upload a clear photo of the front of your driver&apos;s license.
            </p>
            <div className="border-2 border-dashed border-[#AACBEC] rounded-lg p-8 text-center hover:border-[#0169B4] transition-colors cursor-pointer bg-white">
              <input
                type="file"
                id="drivers_license"
                name="drivers_license"
                accept="image/*,.pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setDlFileName(file ? file.name : "");
                }}
              />
              <label htmlFor="drivers_license" className="cursor-pointer space-y-2">
                <svg className="w-8 h-8 mx-auto text-[#AACBEC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[#4d4d4d]">
                  {dlFileName ? dlFileName : "Tap to upload or take a photo"}
                </p>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F8AA02] hover:bg-[#FDC302] text-white font-semibold py-6 text-base rounded-xl"
          >
            {submitting ? "Submitting..." : "Submit Securely"}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[#4d4d4d]/60 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            256-bit encryption &middot; Your data is secure
          </div>
        </form>
      </div>
    </div>
  );
}
