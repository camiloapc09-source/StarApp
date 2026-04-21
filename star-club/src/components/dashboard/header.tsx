"use client";

import { Bell } from "lucide-react";
import LanguageToggle from "@/components/language-toggle";
import PushButton from "@/components/ui/push-button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
}

export function Header({ title, subtitle, notificationCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const roleMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const role = roleMatch?.[1] ?? "player";
  const notificationsHref = `/dashboard/${role}/notifications`;

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl"
      style={{
        background: "rgba(7,7,26,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-8 py-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div>
            <h1
              className="text-lg font-black tracking-tight leading-none"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs mt-0.5 tracking-wide" style={{ color: "rgba(255,255,255,0.28)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right — language + push + notifications */}
        <div className="flex items-center gap-2.5">
          <PushButton />
          <LanguageToggle />

          <Link
            href={notificationsHref}
            className="relative p-2.5 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          >
            <Bell size={16} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
