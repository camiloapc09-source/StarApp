"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  gradient?: string;
  className?: string;
}

export function StatCard({ label, value, change, icon, gradient, className }: StatCardProps) {
  const bg = gradient ?? "linear-gradient(135deg, rgba(139,92,246,0.20), rgba(109,40,217,0.10))";

  return (
    <div
      className={cn("rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200", className)}
      style={{
        background: "rgba(12,10,36,0.75)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        {icon}
      </div>

      {/* Value + label */}
      <div>
        <p className="text-[28px] font-black tracking-tight leading-none mb-1" style={{ color: "rgba(255,255,255,0.95)" }}>
          {value}
        </p>
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </p>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full self-start"
          style={{
            background: change >= 0 ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
            color: change >= 0 ? "#34D399" : "#F87171",
          }}
        >
          {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
