"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NovaWordmark } from "@/components/nova-logo";

const PHI = 1.6180339887;
const STARS = Array.from({ length: 130 }, (_, i) => ({
  id: i,
  x: (i * PHI * 41.7) % 100,
  y: (i * PHI * PHI * 57.3) % 100,
  size: i % 5 === 0 ? 1.8 : i % 3 === 0 ? 1.1 : 0.6,
  opacity: 0.12 + (i % 9) * 0.07,
  duration: 2.5 + (i % 6),
  delay: (i % 5) * 0.65,
}));

function StarField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
          }}
          animate={{ opacity: [s.opacity, s.opacity * 0.1, s.opacity] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 65% 50% at 8% 18%, rgba(76,29,149,0.20) 0%, transparent 58%),
            radial-gradient(ellipse 50% 40% at 90% 72%, rgba(29,78,216,0.12) 0%, transparent 54%),
            radial-gradient(ellipse 40% 32% at 52% 92%, rgba(13,148,136,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 28% 28% at 78% 12%, rgba(139,92,246,0.07) 0%, transparent 48%)
          `,
        }}
      />
    </div>
  );
}

interface Club {
  name: string;
  slug: string;
  sport: string;
  logo: string | null;
  city: string | null;
}

interface Props {
  clubs: Club[];
  sportEmoji: Record<string, string>;
}

export function ClubSelector({ clubs, sportEmoji }: Props) {
  return (
    <main
      className="h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "#030308" }}
    >
      <StarField />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand — wordmark only */}
        <div className="flex flex-col items-center mb-10">
          <NovaWordmark dark={true} showTag={true} height={86} />
        </div>

        {/* Divider */}
        <div className="w-8 h-px mx-auto mb-7" style={{ background: "rgba(255,255,255,0.10)" }} />

        {/* Club selector label */}
        <p
          className="text-[10px] font-bold tracking-[0.42em] uppercase mb-4 text-center"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          Selecciona tu club
        </p>

        {/* Club list */}
        <div className="space-y-2">
          {clubs.map((club, i) => (
            <motion.div
              key={club.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 + i * 0.07 }}
            >
              <Link
                href={`/${club.slug}`}
                className="flex items-center gap-4 px-5 py-4 w-full group transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.38)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                {/* Club logo */}
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "0 0 16px rgba(139,92,246,0.22)",
                  }}
                >
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      style={{ width: "44px", height: "44px", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    sportEmoji[club.sport] ?? "🏆"
                  )}
                </div>

                {/* Club info */}
                <div className="flex-1 text-left">
                  <p className="font-black text-white text-[15px] tracking-tight leading-none mb-[5px]">
                    {club.name}
                  </p>
                  <p
                    className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    {club.sport}{club.city ? ` · ${club.city}` : ""}
                  </p>
                </div>

                {/* Arrow */}
                <span
                  className="text-base transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[9px] tracking-[0.32em] uppercase mt-8"
          style={{ color: "rgba(255,255,255,0.10)" }}
        >
          Powered by StarApp
        </p>
      </motion.div>
    </main>
  );
}
