"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200",
            error && "border-red-500/50",
            className
          )}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.09)"}`,
            color: "rgba(255,255,255,0.85)",
            caretColor: "#8B5CF6",
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? "rgba(239,68,68,0.60)" : "rgba(139,92,246,0.45)";
            e.target.style.boxShadow = error
              ? "0 0 0 3px rgba(239,68,68,0.10)"
              : "0 0 0 3px rgba(139,92,246,0.10)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.09)";
            e.target.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p className="text-[11px]" style={{ color: "rgba(239,68,68,0.85)" }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
