"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, style, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-bold tracking-wide transition-all duration-200 cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";

    const variants: Record<string, string> = {
      // White bg / black text — strong Nike CTA
      primary:
        "bg-white text-[#07071A] hover:bg-white/88 active:scale-[0.97] rounded-lg",
      // Glass border — secondary action
      secondary:
        "rounded-lg border text-white/70 hover:text-white hover:border-white/20 active:scale-[0.97]",
      // Ghost — minimal
      ghost:
        "rounded-lg text-white/50 hover:text-white hover:bg-white/06 active:scale-[0.97]",
      // Danger
      danger:
        "rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.97]",
      // Accent — purple glow (gamification / XP)
      accent:
        "rounded-lg bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.97]",
    };

    const sizes: Record<string, string> = {
      sm: "text-[11px] px-3 py-1.5",
      md: "text-[12px] px-4 py-2.5",
      lg: "text-[13px] px-6 py-3",
    };

    const secondaryStyle =
      variant === "secondary"
        ? {
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.10)",
            ...style,
          }
        : style;

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        style={secondaryStyle}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
