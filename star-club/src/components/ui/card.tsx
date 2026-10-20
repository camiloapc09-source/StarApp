"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, glow = false, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl p-5 transition-all duration-300",
          hover && "cursor-pointer",
          className
        )}
        style={{
          background: "color-mix(in srgb, var(--bg-card) 75%, transparent)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
          ...(glow && { boxShadow: "0 0 24px color-mix(in srgb, var(--accent) 18%, transparent), 0 0 60px color-mix(in srgb, var(--accent) 7%, transparent)" }),
          ...style,
        }}
        onMouseEnter={
          hover
            ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.14)"; }
            : undefined
        }
        onMouseLeave={
          hover
            ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
