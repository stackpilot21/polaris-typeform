import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polaris Typeform",
  description: "Merchant onboarding & document collection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex">
        <aside className="w-56 border-r bg-muted/40 p-4 flex flex-col gap-2 shrink-0">
          <h1 className="text-lg font-bold mb-4">Polaris</h1>
          <a
            href="/deals"
            className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
          >
            Deals
          </a>
          <a
            href="/deals/new"
            className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
          >
            + New Deal
          </a>
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
