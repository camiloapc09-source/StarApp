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
          "rounded-xl p-6 transition-all duration-300",
          hover && "cursor-pointer",
          className
        )}
        style={{
          background: "rgba(14,14,44,0.70)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
          ...(glow && { boxShadow: "0 0 24px rgba(139,92,246,0.18), 0 0 60px rgba(139,92,246,0.07)" }),
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
