"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Trophy,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Target,
  UserCheck,
  Tag,
  FileImage,
  User,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { getClientDictionary } from "@/lib/client-dict";

interface SidebarLink {
  key: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const roleNavigationIds: Record<string, SidebarLink[]> = {
  admin: [
    { key: "dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { key: "players", href: "/dashboard/admin/players", icon: Users },
    { key: "coaches", href: "/dashboard/admin/coaches", icon: UserCheck },
    { key: "attendance", href: "/dashboard/admin/attendance", icon: Calendar },
    { key: "sessions", href: "/dashboard/admin/sessions", icon: Calendar },
    { key: "payments", href: "/dashboard/admin/payments", icon: CreditCard },
    { key: "categories", href: "/dashboard/admin/categories", icon: Tag },
    { key: "gamification", href: "/dashboard/admin/gamification", icon: Trophy },
    { key: "evidence", href: "/dashboard/admin/evidence", icon: FileImage },
    { key: "uniforms",  href: "/dashboard/admin/uniforms",  icon: Shirt },
    { key: "reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  ],
  coach: [
    { key: "dashboard", href: "/dashboard/coach", icon: LayoutDashboard },
    { key: "players", href: "/dashboard/coach/players", icon: Users },
    { key: "sessions", href: "/dashboard/coach/sessions", icon: Calendar },
    { key: "missions", href: "/dashboard/coach/missions", icon: Target },
    { key: "reports", href: "/dashboard/coach/reports", icon: BarChart3 },
    { key: "profile", href: "/dashboard/coach/profile", icon: User },
  ],
  player: [
    { key: "dashboard", href: "/dashboard/player", icon: LayoutDashboard },
    { key: "missions", href: "/dashboard/player/missions", icon: Target },
    { key: "stats", href: "/dashboard/player/stats", icon: BarChart3 },
    { key: "rewards", href: "/dashboard/player/rewards", icon: Trophy },
    { key: "profile", href: "/dashboard/player/profile", icon: User },
  ],
  parent: [
    { key: "dashboard", href: "/dashboard/parent", icon: LayoutDashboard },
    { key: "payments",  href: "/dashboard/parent/payments", icon: CreditCard },
    { key: "uniforms",  href: "/dashboard/parent/uniforms", icon: Shirt },
    { key: "reports",   href: "/dashboard/parent/reports", icon: BarChart3 },
    { key: "profile",   href: "/dashboard/parent/profile", icon: User },
  ],
};

interface SidebarProps {
  role: string;
  userName: string;
  userAvatar?: string | null;
  notificationCount?: number;
  clubName?: string;
  clubLogo?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, userName, userAvatar, notificationCount = 0, clubName = "StarApp", clubLogo, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const dict = getClientDictionary();
  const links = roleNavigationIds[(role ?? "").toLowerCase()] || [];

  return (
    <aside
      className={`dashboard-sidebar${isOpen ? " sidebar-open" : ""} fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] transition-transform duration-300`}
    >
      {/* Close button — mobile only */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)]"
        aria-label="Cerrar menú"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--border-primary)]">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--accent)] flex-shrink-0" style={{ boxShadow: "0 0 10px rgba(139,92,246,0.4)" }}>
          {clubLogo
            ? <img src={clubLogo} alt={clubName} className="w-full h-full object-cover" />
            : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--accent)] bg-[var(--bg-elevated)]">{clubName.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight">{clubName.toUpperCase()}</h1>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
            {dict.common.platformSubtitle}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== `/dashboard/${role.toLowerCase()}` &&
              pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} onClick={onClose}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                )}
              >
                <link.icon size={18} />
                <span>{(dict as any).common[link.key] ?? link.key}</span>
                {link.badge && link.badge > 0 && (
                  <span className="ml-auto bg-accent text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Notifications link */}
        <Link href={`/dashboard/${role.toLowerCase()}/notifications`} onClick={onClose}>
            <motion.div
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname.includes("/notifications")
                ? "bg-accent/10 text-accent"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Bell size={18} />
            <span>{dict.common.notifications}</span>
            {notificationCount > 0 && (
              <span className="ml-auto bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notificationCount}
              </span>
            )}
          </motion.div>
        </Link>
      </nav>

      {/* User profile */}
      <div className="border-t border-[var(--border-primary)] px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={userName} src={userAvatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {role}
            </p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-error transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
