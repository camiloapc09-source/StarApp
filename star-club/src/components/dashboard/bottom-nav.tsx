"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, BarChart3, Target, Trophy,
  User, Calendar, Bell, Shirt, UserCheck, Tag, FileImage,
  Grid3X3, X, type LucideIcon,
} from "lucide-react";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPrefix?: string;
  badge?: number;
}

interface MoreItem {
  href: string;
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
}

const ADMIN_MORE: MoreItem[] = [
  { href: "/dashboard/admin/coaches",      icon: UserCheck,      label: "Entrenadores",  color: "#60A5FA", bg: "rgba(96,165,250,0.15)" },
  { href: "/dashboard/admin/attendance",   icon: Calendar,       label: "Asistencia",    color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  { href: "/dashboard/admin/sessions",     icon: Calendar,       label: "Sesiones",      color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  { href: "/dashboard/admin/categories",   icon: Tag,            label: "Categorías",    color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  { href: "/dashboard/admin/uniforms",     icon: Shirt,          label: "Uniformes",     color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
  { href: "/dashboard/admin/gamification", icon: Trophy,         label: "Gamificación",  color: "#FCD34D", bg: "rgba(251,191,36,0.12)" },
  { href: "/dashboard/admin/evidence",     icon: FileImage,      label: "Evidencias",    color: "#A78BFA", bg: "rgba(139,92,246,0.12)" },
  { href: "/dashboard/admin/reports",      icon: BarChart3,      label: "Reportes",      color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
  { href: "/dashboard/admin/notifications",icon: Bell,           label: "Notificaciones",color: "#F87171", bg: "rgba(239,68,68,0.12)" },
];

const ROLE_TABS: Record<string, (notif: number) => TabItem[]> = {
  admin: (notif) => [
    { href: "/dashboard/admin",          icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/admin/players",  icon: Users,           label: "Jugadores", matchPrefix: "/dashboard/admin/players" },
    { href: "/dashboard/admin/payments", icon: CreditCard,      label: "Pagos",     matchPrefix: "/dashboard/admin/payments" },
    { href: "/dashboard/admin/notifications", icon: Bell,       label: "Notifs",    badge: notif },
    // "Más" is handled separately
  ],
  coach: (notif) => [
    { href: "/dashboard/coach",               icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/coach/players",       icon: Users,           label: "Jugadores" },
    { href: "/dashboard/coach/sessions",      icon: Calendar,        label: "Sesiones" },
    { href: "/dashboard/coach/missions",      icon: Target,          label: "Misiones" },
    { href: "/dashboard/coach/notifications", icon: Bell,            label: "Notifs", badge: notif },
  ],
  player: (_notif) => [
    { href: "/dashboard/player",          icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/player/missions", icon: Target,          label: "Misiones" },
    { href: "/dashboard/player/stats",    icon: BarChart3,       label: "Stats" },
    { href: "/dashboard/player/rewards",  icon: Trophy,          label: "Logros" },
    { href: "/dashboard/player/profile",  icon: User,            label: "Perfil" },
  ],
  parent: (notif) => [
    { href: "/dashboard/parent",             icon: LayoutDashboard, label: "Inicio" },
    { href: "/dashboard/parent/payments",    icon: CreditCard,      label: "Pagos" },
    { href: "/dashboard/parent/uniforms",    icon: Shirt,           label: "Uniformes" },
    { href: "/dashboard/parent/reports",     icon: BarChart3,       label: "Reportes" },
    { href: "/dashboard/parent/profile",     icon: User,            label: "Perfil" },
  ],
};

function TabButton({ tab, isActive }: { tab: TabItem; isActive: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className="flex flex-col items-center gap-[3px] relative"
      style={{ minWidth: 52, padding: "2px 8px" }}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="tab-pill"
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
            style={{ background: "linear-gradient(90deg, #8B5CF6, #60A5FA)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>
      <motion.div
        whileTap={{ scale: 0.85 }}
        className="relative w-10 h-9 flex items-center justify-center rounded-2xl transition-all duration-200"
        style={{ background: isActive ? "rgba(139,92,246,0.15)" : "transparent" }}
      >
        <Icon size={19} strokeWidth={isActive ? 2.4 : 1.7}
          style={{ color: isActive ? "#A78BFA" : "rgba(255,255,255,0.35)" }} />
        {(tab.badge ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #EC4899, #8B5CF6)" }}>
            {(tab.badge ?? 0) > 9 ? "9+" : tab.badge}
          </span>
        )}
      </motion.div>
      <span className="text-[9px] font-semibold tracking-wide leading-none"
        style={{ color: isActive ? "#A78BFA" : "rgba(255,255,255,0.25)" }}>
        {tab.label}
      </span>
    </Link>
  );
}

export function BottomNav({ role, notificationCount = 0 }: { role: string; notificationCount?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = role.toLowerCase() === "admin";

  const tabsFn = ROLE_TABS[role.toLowerCase()];
  if (!tabsFn) return null;
  const tabs = tabsFn(notificationCount);

  const moreIsActive = isAdmin && ADMIN_MORE.some(m => pathname.startsWith(m.href));

  return (
    <>
      {/* More sheet overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden"
              style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl pb-10"
              style={{ background: "rgba(8,6,28,0.98)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(32px)" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>

              <div className="flex items-center justify-between px-6 py-3">
                <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Más opciones
                </p>
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-xl" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 px-5 pb-4">
                {ADMIN_MORE.map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}>
                      <div
                        className="flex flex-col items-center gap-2.5 py-4 rounded-2xl transition-all"
                        style={{
                          background: active ? item.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? item.color.replace(")", ",0.30)").replace("rgb", "rgba") : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
                          <Icon size={18} style={{ color: item.color }} strokeWidth={1.8} />
                        </div>
                        <span className="text-[10px] font-semibold text-center leading-tight px-1"
                          style={{ color: active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.50)" }}>
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
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
          return <TabButton key={tab.href} tab={tab} isActive={isActive} />;
        })}

        {/* "Más" button for admin */}
        {isAdmin && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-[3px] relative"
            style={{ minWidth: 52, padding: "2px 8px" }}
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              className="w-10 h-9 flex items-center justify-center rounded-2xl transition-all duration-200"
              style={{ background: moreIsActive ? "rgba(139,92,246,0.15)" : "transparent" }}
            >
              <Grid3X3 size={19} strokeWidth={1.7}
                style={{ color: moreIsActive ? "#A78BFA" : "rgba(255,255,255,0.35)" }} />
            </motion.div>
            <span className="text-[9px] font-semibold tracking-wide leading-none"
              style={{ color: moreIsActive ? "#A78BFA" : "rgba(255,255,255,0.25)" }}>
              Más
            </span>
          </button>
        )}
      </nav>
    </>
  );
}
