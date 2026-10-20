"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg text-sm appearance-none outline-none transition-all duration-200",
            className
          )}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.09)"}`,
            color: "rgba(255,255,255,0.85)",
            ...style,
          }}
          onFocus={(e) => { e.target.style.borderColor = "color-mix(in srgb, var(--accent) 45%, transparent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent)"; }}
          onBlur={(e) => { e.target.style.borderColor = error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: "var(--bg-card)", color: "rgba(255,255,255,0.85)" }}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px]" style={{ color: "rgba(239,68,68,0.85)" }}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export { Select };
