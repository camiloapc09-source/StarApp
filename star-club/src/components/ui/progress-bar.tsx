"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: "sm" | "md" | "lg";
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "bg-accent",
  height = "md",
  animated = true,
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-[var(--text-secondary)]">
            {value} / {max}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden",
          heightClasses[height]
        )}
      >
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full rounded-full", color)}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
