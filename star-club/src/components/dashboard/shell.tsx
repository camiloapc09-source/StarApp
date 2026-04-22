"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { DashboardContext } from "./dashboard-context";
import { NovaWordmark } from "@/components/nova-logo";
import { LogOut } from "lucide-react";
import PushButton from "@/components/ui/push-button";

interface DashboardShellProps {
  role: string;
  userName: string;
  userAvatar?: string | null;
  notificationCount?: number;
  clubName?: string;
  clubLogo?: string | null;
  plan?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName,
  userAvatar,
  notificationCount = 0,
  clubName = "StarApp",
  clubLogo,
  plan = "STARTER",
  children,
}: DashboardShellProps) {
  return (
    <DashboardContext.Provider value={{ clubLogo, clubName, plan }}>
      <div className="min-h-screen bg-[var(--bg-primary)]">
        {/* Desktop sidebar */}
        <Sidebar
          role={role}
          userName={userName}
          userAvatar={userAvatar}
          notificationCount={notificationCount}
          clubName={clubName}
          clubLogo={clubLogo}
          plan={plan}
          isOpen={false}
          onClose={() => {}}
        />

        {/* Main content */}
        <main className="md:ml-64 min-h-screen pb-24 md:pb-0">
          {/* Mobile top bar — clean, no hamburger */}
          <div
            className="md:hidden sticky top-0 z-20 flex items-center justify-between px-5 py-3 backdrop-blur-2xl"
            style={{
              background: "rgba(5,5,20,0.92)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Club logo + name */}
            <div className="flex items-center gap-2.5">
              {clubLogo ? (
                <img
                  src={clubLogo}
                  alt={clubName}
                  className="w-7 h-7 rounded-full object-cover"
                  style={{ border: "1px solid rgba(139,92,246,0.4)" }}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(96,165,250,0.2))",
                    border: "1px solid rgba(139,92,246,0.4)",
                    color: "#C4B5FD",
                  }}
                >
                  {clubName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[13px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
                {clubName}
              </span>
            </div>

            {/* Wordmark centered */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <NovaWordmark dark height={22} showTag={false} />
            </div>

            {/* Right: push + logout */}
            <div className="flex items-center gap-1">
              <PushButton />
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                  title="Cerrar sesión"
                >
                  <LogOut size={17} strokeWidth={1.8} />
                </button>
              </form>
            </div>
          </div>

          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav role={role} notificationCount={notificationCount} />
      </div>
    </DashboardContext.Provider>
  );
}
