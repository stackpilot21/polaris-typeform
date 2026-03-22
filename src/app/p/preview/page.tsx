"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SSNInput } from "@/components/ssn-input";

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

function PreviewForm() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Principal";
  const merchant = searchParams.get("merchant") || "Merchant";
  const [ssn, setSSN] = useState("");
  const [dob, setDob] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dlFileName, setDlFileName] = useState("");

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-[#0169B4] via-[#00B6ED] to-[#F8AA02]" />

      {/* Form */}
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold text-[#1a1a2e] mb-2">
            Submit Your Information
          </h1>
          <p className="text-[#4d4d4d] text-sm leading-relaxed">
            Hi {name}, please fill out the form below for{" "}
            <span className="text-[#0169B4] font-semibold">{merchant}</span>.
            Your information is encrypted and stored securely.
          </p>
        </div>

        <ProgressBar filled={filledCount} total={totalFields} />

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            alert("This is a preview — no data will be submitted.");
          }}
        >
          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">
              Personal Information
            </h2>
            <div>
              <Label htmlFor="ssn" className="text-[#4d4d4d] text-sm">
                Social Security Number
              </Label>
              <SSNInput
                id="ssn"
                value={ssn}
                onChange={setSSN}
                className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]"
              />
            </div>
            <div>
              <Label htmlFor="dob" className="text-[#4d4d4d] text-sm">
                Date of Birth
              </Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#d8e3ef] bg-[#f7f9fc] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0169B4] uppercase tracking-wider">
              Residential Address
            </h2>
            <div>
              <Label htmlFor="address_line1" className="text-[#4d4d4d] text-sm">
                Street Address
              </Label>
              <Input
                id="address_line1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]"
              />
            </div>
            <div>
              <Label htmlFor="address_line2" className="text-[#4d4d4d] text-sm">
                Apt / Suite (optional)
              </Label>
              <Input
                id="address_line2"
                className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4] focus:ring-[#00B6ED]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="city" className="text-[#4d4d4d] text-sm">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
              </div>
              <div>
                <Label htmlFor="state" className="text-[#4d4d4d] text-sm">State</Label>
                <Input id="state" maxLength={2} value={state} onChange={(e) => setState(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
              </div>
              <div>
                <Label htmlFor="zip" className="text-[#4d4d4d] text-sm">ZIP</Label>
                <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1 bg-white border-[#AACBEC] focus:border-[#0169B4]" />
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
            className="w-full bg-[#F8AA02] hover:bg-[#FDC302] text-white font-semibold py-6 text-base rounded-xl"
          >
            Submit Securely
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

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-[#4d4d4d]">Loading...</p>
        </div>
      }
    >
      <PreviewForm />
    </Suspense>
  );
}
