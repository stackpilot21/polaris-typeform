"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeFlash, setBadgeFlash] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    function poll() {
      fetch("/api/messages?unread=true")
        .then((r) => r.json())
        .then((data) => {
          const newCount = data.unread_count || 0;
          if (prevUnreadRef.current !== null && newCount > prevUnreadRef.current) {
            toast("New message received");
            setBadgeFlash(true);
            setTimeout(() => setBadgeFlash(false), 2000);
          }
          prevUnreadRef.current = newCount;
          setUnreadCount(newCount);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <KeyboardShortcuts />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-40 w-60 bg-[#0169B4] text-white flex flex-col shrink-0 h-full md:h-auto transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight">
              POLARIS
            </h1>
            <p className="text-xs text-[#AACBEC] mt-0.5">Payments</p>
          </div>
          <button
            className="md:hidden text-white/80 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#00B6ED]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            Dashboard
          </a>
          <a
            href="/deals"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#00B6ED]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Deals
          </a>
          <a
            href="/messages"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#00B6ED]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Messages
            {unreadCount > 0 && (
              <span className={`ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${badgeFlash ? "animate-badge-pulse" : ""}`}>
                {unreadCount}
              </span>
            )}
          </a>
          <a
            href="/deals/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#00B6ED]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Deal
          </a>
          <a
            href="/deals/new/transcript"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#F8AA02]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            AI Intake
          </a>
        </nav>
        <div className="p-4 border-t border-[#0157a0] space-y-2">
          <a
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#0157a0] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#00B6ED]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </a>
          <p className="text-xs text-[#AACBEC]/60 px-3">
            Polaris Payments &copy; 2026
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-heading font-bold text-[#0169B4]">POLARIS</h1>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#f7f9fc]">{children}</main>
      </div>
    </div>
  );
}
