"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, BarChart3, Target, Trophy,
  User, Calendar, Bell, Shirt, type LucideIcon,
} from "lucide-react";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPrefix?: string;
  badge?: number;
}

const ROLE_TABS: Record<string, (notif: number) => TabItem[]> = {
  admin: (notif) => [
    { href: "/dashboard/admin",               icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/admin/players",       icon: Users,           label: "Jugadores",  matchPrefix: "/dashboard/admin/players" },
    { href: "/dashboard/admin/payments",      icon: CreditCard,      label: "Pagos",      matchPrefix: "/dashboard/admin/payments" },
    { href: "/dashboard/admin/reports",       icon: BarChart3,       label: "Reportes",   matchPrefix: "/dashboard/admin/reports" },
    { href: "/dashboard/admin/notifications", icon: Bell,            label: "Notifs",     badge: notif },
  ],
  coach: (notif) => [
    { href: "/dashboard/coach",               icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/coach/players",       icon: Users,           label: "Jugadores" },
    { href: "/dashboard/coach/sessions",      icon: Calendar,        label: "Sesiones" },
    { href: "/dashboard/coach/missions",      icon: Target,          label: "Misiones" },
    { href: "/dashboard/coach/notifications", icon: Bell,            label: "Notifs", badge: notif },
  ],
  player: (notif) => [
    { href: "/dashboard/player",              icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/player/missions",     icon: Target,          label: "Misiones" },
    { href: "/dashboard/player/stats",        icon: BarChart3,       label: "Stats" },
    { href: "/dashboard/player/rewards",      icon: Trophy,          label: "Logros" },
    { href: "/dashboard/player/profile",      icon: User,            label: "Perfil" },
  ],
  parent: (notif) => [
    { href: "/dashboard/parent",              icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/parent/payments",     icon: CreditCard,      label: "Pagos" },
    { href: "/dashboard/parent/uniforms",     icon: Shirt,           label: "Uniformes" },
    { href: "/dashboard/parent/reports",      icon: BarChart3,       label: "Reportes" },
    { href: "/dashboard/parent/profile",      icon: User,            label: "Perfil" },
  ],
};

export function BottomNav({ role, notificationCount = 0 }: { role: string; notificationCount?: number }) {
  const pathname = usePathname();
  const tabsFn = ROLE_TABS[role.toLowerCase()];
  if (!tabsFn) return null;
  const tabs = tabsFn(notificationCount);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around px-1"
      style={{
        background: "rgba(5,5,20,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(28px)",
        paddingTop: "8px",
        paddingBottom: "max(14px, env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.matchPrefix
          ? pathname.startsWith(tab.matchPrefix)
          : pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-[3px] relative"
            style={{ minWidth: 52, padding: "2px 8px" }}
          >
            {/* Active pill indicator */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                  style={{ background: "linear-gradient(90deg, #8B5CF6, #60A5FA)" }}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 24 }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25 }}
                />
              )}
            </AnimatePresence>

            {/* Icon container */}
            <motion.div
              whileTap={{ scale: 0.85 }}
              className="relative w-10 h-9 flex items-center justify-center rounded-2xl transition-all duration-200"
              style={{ background: isActive ? "rgba(139,92,246,0.15)" : "transparent" }}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.4 : 1.7}
                style={{
                  color: isActive ? "#A78BFA" : "rgba(255,255,255,0.35)",
                  transition: "color 0.2s",
                }}
              />
              {/* Badge */}
              {(tab.badge ?? 0) > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                  style={{ background: "linear-gradient(135deg, #EC4899, #8B5CF6)" }}
                >
                  {(tab.badge ?? 0) > 9 ? "9+" : tab.badge}
                </span>
              )}
            </motion.div>

            <span
              className="text-[9px] font-semibold tracking-wide leading-none"
              style={{ color: isActive ? "#A78BFA" : "rgba(255,255,255,0.25)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
