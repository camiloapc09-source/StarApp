"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "accent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    default:  { background: "rgba(255,255,255,0.06)",  color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" },
    success:  { background: "rgba(0,255,135,0.08)",    color: "#00e87a",                border: "1px solid rgba(0,255,135,0.15)" },
    warning:  { background: "rgba(255,184,0,0.08)",    color: "#f0a800",                border: "1px solid rgba(255,184,0,0.15)" },
    error:    { background: "rgba(255,71,87,0.08)",    color: "#ff4757",                border: "1px solid rgba(255,71,87,0.15)" },
    info:     { background: "rgba(59,130,246,0.08)",   color: "#60a5fa",                border: "1px solid rgba(59,130,246,0.15)" },
    accent:   { background: "rgba(139,92,246,0.10)",   color: "#DEC4FF",               border: "1px solid rgba(139,92,246,0.20)" },
  };

  return (
    <span
      className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide", className)}
      style={styles[variant]}
    >
      {children}
    </span>
  );
}
