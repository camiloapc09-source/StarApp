"use client";

import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
        style={{ border: "1px solid rgba(255,255,255,0.10)" }}
      />
    );
  }

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold", sizeClasses[size], className)}
      style={{
        background: "rgba(139,92,246,0.12)",
        border: "1px solid rgba(139,92,246,0.25)",
        color: "#DEC4FF",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
