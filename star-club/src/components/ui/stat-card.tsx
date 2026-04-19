"use client";

import { cn } from "@/lib/utils";
import { Card } from "./card";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  iconColor?: string;
  className?: string;
}

export function StatCard({ label, value, change, icon, iconColor = "text-accent", className }: StatCardProps) {
  return (
    <Card className={cn("flex items-start justify-between", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.32)" }}>
          {label}
        </p>
        <p className="text-2xl font-black tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          {value}
        </p>
        {change !== undefined && (
          <p className={cn("text-[11px] font-semibold", change >= 0 ? "text-emerald-400" : "text-red-400")}>
            {change >= 0 ? "+" : ""}{change}% vs mes anterior
          </p>
        )}
      </div>
      <div
        className={cn("p-2.5 rounded-lg flex-shrink-0", iconColor)}
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {icon}
      </div>
    </Card>
  );
}
