"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  role: string;
  userName: string;
  userAvatar?: string | null;
  notificationCount?: number;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName,
  userAvatar,
  notificationCount,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        notificationCount={notificationCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Content — full width on mobile, shifted on desktop */}
      <main className="md:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur border-b border-[var(--border-primary)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]"
            aria-label="Abrir menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-black font-black text-xs">SC</span>
            </div>
            <span className="font-bold text-sm tracking-tight">STAR CLUB</span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
