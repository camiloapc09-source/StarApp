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

export function StatCard({
  label,
  value,
  change,
  icon,
  iconColor = "text-accent",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex items-start justify-between", className)}>
      <div className="space-y-1">
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {change !== undefined && (
          <p
            className={cn(
              "text-xs font-medium",
              change >= 0 ? "text-success" : "text-error"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change}% from last month
          </p>
        )}
      </div>
      <div
        className={cn(
          "p-3 rounded-xl bg-[var(--bg-elevated)]",
          iconColor
        )}
      >
        {icon}
      </div>
    </Card>
  );
}
