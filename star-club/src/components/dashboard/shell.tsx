"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { DashboardContext } from "./dashboard-context";

interface DashboardShellProps {
  role: string;
  userName: string;
  userAvatar?: string | null;
  notificationCount?: number;
  clubName?: string;
  clubLogo?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName,
  userAvatar,
  notificationCount,
  clubName = "StarApp",
  clubLogo,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardContext.Provider value={{ clubLogo, clubName }}>
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
        clubName={clubName}
        clubLogo={clubLogo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Content — full width on mobile, shifted on desktop */}
      <main className="md:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20 backdrop-blur-xl"
          style={{
            background: "rgba(7,7,26,0.88)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.70)",
            }}
            aria-label="Abrir menú"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {clubLogo ? (
              <img
                src={clubLogo}
                alt={clubName}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                style={{ border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 0 8px rgba(139,92,246,0.25)" }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  color: "#DEC4FF",
                  boxShadow: "0 0 8px rgba(139,92,246,0.20)",
                }}
              >
                {clubName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="text-sm font-black tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.88)" }}
            >
              {clubName}
            </span>
          </div>

          <div className="w-8" />
        </div>

        {children}
      </main>
    </div>
    </DashboardContext.Provider>
  );
}
