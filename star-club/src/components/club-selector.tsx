"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NovaWordmark } from "@/components/nova-logo";
import { ArrowRight } from "lucide-react";

const SPORT_EMOJI: Record<string, string> = {
  BASKETBALL: "🏀", VOLLEYBALL: "🏐", FOOTBALL: "⚽",
  BASEBALL: "⚾", TENNIS: "🎾", SWIMMING: "🏊",
};

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden"
      style={{ background: "#06060F" }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 15% 10%, rgba(88,28,235,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 85% 80%, rgba(29,78,216,0.11) 0%, transparent 55%),
            radial-gradient(ellipse 35% 35% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%)
          `,
        }}
      />

      {mounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 60 }, (_, i) => ({
            x: (i * 1.618 * 41.7) % 100,
            y: (i * 1.618 * 1.618 * 57.3) % 100,
            s: i % 5 === 0 ? 1.6 : 0.7,
            o: 0.08 + (i % 7) * 0.05,
          })).map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <NovaWordmark dark={true} showTag={true} height={56} />
        </div>

        {/* Label */}
        <p
          className="text-[10px] font-bold tracking-[0.38em] uppercase mb-4 text-center"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          Selecciona tu club
        </p>

        {/* Club list */}
        <div className="space-y-3">
          {clubs.map((club, i) => (
            <motion.div
              key={club.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.10 + i * 0.08 }}
            >
              <Link href={`/${club.slug}`} className="block group">
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.08)";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.30)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  }}
                >
                  {/* Club logo */}
                  <div
                    className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    {club.logo ? (
                      <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      SPORT_EMOJI[club.sport] ?? sportEmoji[club.sport] ?? "🏆"
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-white leading-none mb-1 truncate">{club.name}</p>
                    <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.32)" }}>
                      {club.sport}{club.city ? ` · ${club.city}` : ""}
                    </p>
                  </div>

                  <ArrowRight
                    size={16}
                    className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: "rgba(255,255,255,0.20)" }}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <p
          className="text-center text-[9px] tracking-[0.32em] uppercase mt-10"
          style={{ color: "rgba(255,255,255,0.10)" }}
        >
          Powered by StarApp
        </p>
      </motion.div>
    </main>
  );
}
