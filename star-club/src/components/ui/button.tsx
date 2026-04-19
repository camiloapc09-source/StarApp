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
      "inline-flex items-center justify-center gap-2 font-bold tracking-wide transition-all duration-200 cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]";

    const variants: Record<string, string> = {
      // Gradient CTA — energetic, modern
      primary:
        "rounded-2xl text-white",
      // Glass — secondary action
      secondary:
        "rounded-2xl border text-white/70 hover:text-white hover:border-white/20",
      // Ghost — minimal
      ghost:
        "rounded-2xl text-white/50 hover:text-white hover:bg-white/06",
      // Danger
      danger:
        "rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20",
      // Accent — violet glow
      accent:
        "rounded-2xl text-white",
    };

    const sizes: Record<string, string> = {
      sm: "text-[11px] px-3.5 py-2",
      md: "text-[12px] px-5 py-2.5",
      lg: "text-[13px] px-6 py-3.5",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4338CA 100%)",
        boxShadow: "0 6px 20px rgba(124,58,237,0.30)",
        ...style,
      },
      secondary: {
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.10)",
        ...style,
      },
      ghost: { ...style },
      danger: { ...style },
      accent: {
        background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        boxShadow: "0 4px 16px rgba(139,92,246,0.30)",
        ...style,
      },
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        style={variantStyles[variant]}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
