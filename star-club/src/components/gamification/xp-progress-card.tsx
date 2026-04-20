"use client";

import { motion } from "framer-motion";
import { cn, calculateLevel, xpForLevel, xpForNextLevel, LEVEL_TITLES, xpProgress } from "@/lib/utils";
import { Zap, Flame } from "lucide-react";

interface XPProgressCardProps {
  xp: number;
  level?: number;
  streak: number;
  rank?: number;
  totalPlayers?: number;
  className?: string;
}

const LEVEL_COLORS: Record<number, { from: string; to: string; glow: string }> = {
  1:  { from: "#6B7280", to: "#4B5563", glow: "rgba(107,114,128,0.2)" },
  2:  { from: "#10B981", to: "#059669", glow: "rgba(16,185,129,0.2)" },
  3:  { from: "#3B82F6", to: "#2563EB", glow: "rgba(59,130,246,0.2)" },
  4:  { from: "#8B5CF6", to: "#7C3AED", glow: "rgba(139,92,246,0.25)" },
  5:  { from: "#F59E0B", to: "#D97706", glow: "rgba(245,158,11,0.25)" },
  6:  { from: "#EF4444", to: "#DC2626", glow: "rgba(239,68,68,0.25)" },
  7:  { from: "#EC4899", to: "#DB2777", glow: "rgba(236,72,153,0.25)" },
  8:  { from: "#F97316", to: "#EA580C", glow: "rgba(249,115,22,0.25)" },
  9:  { from: "#A78BFA", to: "#7C3AED", glow: "rgba(167,139,250,0.30)" },
  10: { from: "#FCD34D", to: "#F59E0B", glow: "rgba(252,211,77,0.35)" },
};

export function XPProgressCard({ xp, level, streak, rank, totalPlayers, className }: XPProgressCardProps) {
  const currentLevel = calculateLevel(xp);
  const currentXp   = xpForLevel(currentLevel);
  const nextXp      = xpForNextLevel(currentLevel);
  const progress    = xpProgress(xp, currentLevel);
  const title       = LEVEL_TITLES[currentLevel] || "Leyenda";
  const colors      = LEVEL_COLORS[currentLevel] ?? LEVEL_COLORS[1];
  const xpToNext    = nextXp - xp;

  return (
    <div
      className={cn("rounded-2xl p-5 relative overflow-hidden", className)}
      style={{
        background: `linear-gradient(135deg, rgba(14,14,44,0.95) 0%, rgba(20,10,50,0.90) 100%)`,
        border: `1px solid ${colors.glow.replace("0.2)", "0.35)").replace("0.25)", "0.35)").replace("0.30)", "0.40)").replace("0.35)", "0.45)")}`,
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 90% 20%, ${colors.glow} 0%, transparent 65%)` }} />

      <div className="relative z-10">
        {/* Top row: level + streak */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Nivel
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter" style={{ color: colors.from }}>
                {currentLevel}
              </span>
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                {title}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Streak */}
            {streak > 0 ? (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.25)" }}
              >
                <Flame size={16} style={{ color: "#FF6B35" }} />
                <span className="text-sm font-black" style={{ color: "#FF6B35" }}>{streak}</span>
                <span className="text-[10px] font-semibold" style={{ color: "rgba(255,107,53,0.7)" }}>racha</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Flame size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Sin racha</span>
              </div>
            )}

            {/* Rank */}
            {rank != null && totalPlayers != null && (
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color: colors.from }}>
                  #{rank} de {totalPlayers}
                </p>
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>en el club</p>
              </div>
            )}
          </div>
        </div>

        {/* XP info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap size={13} style={{ color: colors.from }} />
            <span className="text-sm font-bold">{xp.toLocaleString("es-CO")} XP</span>
          </div>
          {currentLevel < 10 && (
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              faltan {xpToNext.toLocaleString("es-CO")} XP para nivel {currentLevel + 1}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full overflow-hidden" style={{ height: 7, background: "rgba(255,255,255,0.07)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
              boxShadow: `0 0 10px ${colors.glow}`,
            }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            {(xp - currentXp).toLocaleString("es-CO")} / {(nextXp - currentXp).toLocaleString("es-CO")} XP
          </span>
          <span className="text-[9px] font-bold" style={{ color: colors.from }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
