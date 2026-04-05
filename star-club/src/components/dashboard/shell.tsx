"use client";

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
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        notificationCount={notificationCount}
      />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
