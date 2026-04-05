"use client";

import { motion } from "framer-motion";
import { cn, calculateLevel, xpForLevel, xpForNextLevel, LEVEL_TITLES, xpProgress } from "@/lib/utils";
import { Zap, Flame } from "lucide-react";

interface XPProgressCardProps {
  xp: number;
  level: number;
  streak: number;
  className?: string;
}

export function XPProgressCard({ xp, level, streak, className }: XPProgressCardProps) {
  const currentLevel = calculateLevel(xp);
  const currentXp = xpForLevel(currentLevel);
  const nextXp = xpForNextLevel(currentLevel);
  const progress = xpProgress(xp, currentLevel);
  const title = LEVEL_TITLES[currentLevel] || "Legend";

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-primary)] p-6 relative overflow-hidden",
        "bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)]",
        className
      )}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,135,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10">
        {/* Level badge */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
              Level
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className="text-5xl font-black tracking-tighter"
                style={{ color: "var(--accent)" }}
              >
                {currentLevel}
              </span>
              <span className="text-lg font-bold" style={{ color: "var(--text-secondary)" }}>
                {title}
              </span>
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(255, 107, 53, 0.1)",
                border: "1px solid rgba(255, 107, 53, 0.2)",
              }}
            >
              <Flame size={20} style={{ color: "var(--streak-fire)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--streak-fire)" }}>
                {streak}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                streak
              </span>
            </motion.div>
          )}
        </div>

        {/* XP info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap size={14} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold">{xp.toLocaleString()} XP</span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {nextXp.toLocaleString()} XP to level {currentLevel + 1}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, background: "var(--bg-elevated)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-dim) 100%)",
              boxShadow: "0 0 12px rgba(0,255,135,0.4)",
            }}
          />
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {xp - currentXp} / {nextXp - currentXp} XP
          </span>
          <span className="text-[10px]" style={{ color: "var(--accent)" }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
