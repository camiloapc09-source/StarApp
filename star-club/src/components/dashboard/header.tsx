"use client";

import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import LanguageToggle from "@/components/language-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  searchPlaceholder?: string;
}

export function Header({ title, subtitle, notificationCount = 0, searchPlaceholder }: HeaderProps) {
  const pathname = usePathname();
  // derive role from current path: /dashboard/admin/... → admin
  const roleMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const role = roleMatch?.[1] ?? "player";
  const notificationsHref = `/dashboard/${role}/notifications`;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border-primary)]">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder={searchPlaceholder ?? "Buscar..."}
              className={cn(
                "pl-9 pr-4 py-2 rounded-xl text-sm w-64",
                "bg-[var(--bg-elevated)] border border-[var(--border-primary)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:ring-2 focus:ring-accent/30"
              )}
            />
          </div>

          <LanguageToggle />

          {/* Notifications */}
          <Link
            href={notificationsHref}
            className="relative p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-all"
          >
            <Bell size={18} className="text-[var(--text-secondary)]" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
