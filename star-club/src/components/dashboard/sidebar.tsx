"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, CreditCard, Trophy, Bell,
  BarChart3, Target, UserCheck, Tag, FileImage, User, Shirt, LogOut, Settings,
  Lock, UserPlus,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { getClientDictionary } from "@/lib/client-dict";
import { NovaWordmark } from "@/components/nova-logo";
import { getLimits } from "@/lib/plans";

interface SidebarLink {
  key: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  // which plan feature gates this item (undefined = always visible)
  planFeature?: "gamification" | "evidence" | "uniforms" | "exportExcel";
}

const roleNavigationIds: Record<string, SidebarLink[]> = {
  admin: [
    { key: "dashboard",    href: "/dashboard/admin",              icon: LayoutDashboard },
    { key: "players",      href: "/dashboard/admin/players",      icon: Users },
    { key: "coaches",      href: "/dashboard/admin/coaches",      icon: UserCheck },
    { key: "attendance",   href: "/dashboard/admin/attendance",   icon: Calendar },
    { key: "sessions",     href: "/dashboard/admin/sessions",     icon: Calendar },
    { key: "payments",     href: "/dashboard/admin/payments",     icon: CreditCard },
    { key: "categories",   href: "/dashboard/admin/categories",   icon: Tag },
    { key: "gamification", href: "/dashboard/admin/gamification", icon: Trophy,    planFeature: "gamification" },
    { key: "evidence",     href: "/dashboard/admin/evidence",     icon: FileImage, planFeature: "evidence" },
    { key: "uniforms",     href: "/dashboard/admin/uniforms",     icon: Shirt,     planFeature: "uniforms" },
    { key: "reports",      href: "/dashboard/admin/reports",      icon: BarChart3 },
    { key: "settings",     href: "/dashboard/admin/settings",     icon: Settings },
  ],
  coach: [
    { key: "dashboard", href: "/dashboard/coach",              icon: LayoutDashboard },
    { key: "players",   href: "/dashboard/coach/players",      icon: Users },
    { key: "sessions",  href: "/dashboard/coach/sessions",     icon: Calendar },
    { key: "missions",  href: "/dashboard/coach/missions",     icon: Target },
    { key: "reports",   href: "/dashboard/coach/reports",      icon: BarChart3 },
    { key: "invites",  href: "/dashboard/coach/invites",     icon: UserPlus },
    { key: "profile",   href: "/dashboard/coach/profile",      icon: User },
  ],
  player: [
    { key: "dashboard", href: "/dashboard/player",             icon: LayoutDashboard },
    { key: "missions",  href: "/dashboard/player/missions",    icon: Target },
    { key: "stats",     href: "/dashboard/player/stats",       icon: BarChart3 },
    { key: "rewards",   href: "/dashboard/player/rewards",     icon: Trophy },
    { key: "profile",   href: "/dashboard/player/profile",     icon: User },
  ],
  parent: [
    { key: "dashboard", href: "/dashboard/parent",             icon: LayoutDashboard },
    { key: "payments",  href: "/dashboard/parent/payments",    icon: CreditCard },
    { key: "uniforms",  href: "/dashboard/parent/uniforms",    icon: Shirt,     planFeature: "uniforms" },
    { key: "reports",   href: "/dashboard/parent/reports",     icon: BarChart3 },
    { key: "profile",   href: "/dashboard/parent/profile",     icon: User },
  ],
};

interface SidebarProps {
  role: string;
  userName: string;
  userAvatar?: string | null;
  notificationCount?: number;
  clubName?: string;
  clubLogo?: string | null;
  plan?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  role, userName, notificationCount = 0,
  clubName = "StarApp", clubLogo, plan = "STARTER", isOpen = false, onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const dict = getClientDictionary();
  const links = roleNavigationIds[(role ?? "").toLowerCase()] || [];
  const limits = getLimits(plan);

  return (
    <aside
      className={`dashboard-sidebar${isOpen ? " sidebar-open" : ""} fixed left-0 top-0 z-40 h-screen w-64 flex flex-col transition-transform duration-300`}
      style={{
        background: "rgba(5,5,18,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Mobile close */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
        aria-label="Cerrar menú"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Top — StarApp wordmark */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.35))" }}>
          <NovaWordmark dark={true} showTag={false} height={32} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== `/dashboard/${role.toLowerCase()}` && pathname.startsWith(link.href));

          // Check if this feature is locked by the current plan
          const isLocked = link.planFeature
            ? !(limits[link.planFeature] as boolean)
            : false;

          if (isLocked) {
            return (
              <div key={link.href} title={`Disponible en Plan PRO`}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.20)", cursor: "not-allowed" }}
                >
                  <link.icon size={16} strokeWidth={1.5} />
                  <span className="tracking-wide flex-1">{(dict as any).common[link.key] ?? link.key}</span>
                  <Lock size={11} style={{ color: "rgba(255,184,0,0.50)", flexShrink: 0 }} />
                </div>
              </div>
            );
          }

          return (
            <Link key={link.href} href={link.href} onClick={onClose}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative"
                style={{
                  background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                  color: isActive ? "#DEC4FF" : "rgba(255,255,255,0.42)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ background: "#8B5CF6", boxShadow: "0 0 8px rgba(139,92,246,0.8)" }}
                  />
                )}
                <link.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                <span className="tracking-wide">{(dict as any).common[link.key] ?? link.key}</span>
                {link.badge && link.badge > 0 && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">
                    {link.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Notifications */}
        <Link href={`/dashboard/${role.toLowerCase()}/notifications`} onClick={onClose}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: pathname.includes("/notifications") ? "rgba(139,92,246,0.12)" : "transparent",
              color: pathname.includes("/notifications") ? "#DEC4FF" : "rgba(255,255,255,0.42)",
            }}
            onMouseEnter={(e) => {
              if (!pathname.includes("/notifications")) {
                e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!pathname.includes("/notifications")) {
                e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Bell size={16} strokeWidth={1.5} />
            <span className="tracking-wide">{dict.common.notifications}</span>
            {notificationCount > 0 && (
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                {notificationCount}
              </span>
            )}
          </motion.div>
        </Link>

        {/* Plan badge — solo STARTER */}
        {plan === "STARTER" && (
          <div className="mt-3 mx-1 px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,184,0,0.06)", border: "1px solid rgba(255,184,0,0.15)" }}>
            <p className="text-[10px] font-bold tracking-wider uppercase mb-0.5" style={{ color: "rgba(255,184,0,0.60)" }}>
              Plan Starter
            </p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>
              Actualiza a PRO para desbloquear gamificación, evidencias y más.
            </p>
          </div>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
            style={{
              border: "1px solid rgba(139,92,246,0.40)",
              boxShadow: "0 0 10px rgba(139,92,246,0.20)",
              background: "rgba(139,92,246,0.10)",
              color: "#DEC4FF",
            }}
          >
            {clubLogo
              ? <img src={clubLogo} alt={clubName} className="w-full h-full object-cover" />
              : clubName.charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate leading-none mb-1" style={{ color: "rgba(255,255,255,0.82)" }}>
              {userName}
            </p>
            <p className="text-[9px] tracking-[0.18em] uppercase truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
              {clubName} · {role}
            </p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.22)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,100,100,0.75)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
