"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, X, Tag, UserPlus, Calendar } from "lucide-react";

interface Props {
  hasCategories: boolean;
  hasPlayers: boolean;
  hasSessions: boolean;
}

const STEPS = [
  {
    key: "categories",
    icon: Tag,
    title: "Crea tu primera categoría",
    desc: "Define los grupos de edad de tu club (Sub-10, Sub-12, etc.).",
    href: "/dashboard/admin/categories",
    cta: "Ir a categorías →",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
  },
  {
    key: "players",
    icon: UserPlus,
    title: "Invita tu primer jugador",
    desc: "Genera un enlace de registro y compártelo con el deportista o su padre.",
    href: "/dashboard/admin/players/invites",
    cta: "Crear invitación →",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.25)",
  },
  {
    key: "sessions",
    icon: Calendar,
    title: "Programa tu primera sesión",
    desc: "Crea un entrenamiento o partido para empezar a tomar asistencia.",
    href: "/dashboard/admin/sessions",
    cta: "Crear sesión →",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.25)",
  },
];

export default function OnboardingWizard({ hasCategories, hasPlayers, hasSessions }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const done = { categories: hasCategories, players: hasPlayers, sessions: hasSessions };
  const allDone = hasCategories && hasPlayers && hasSessions;

  if (dismissed || allDone) return null;

  const completedCount = Object.values(done).filter(Boolean).length;

  return (
    <div
      className="rounded-2xl p-5 relative"
      style={{ background: "rgba(14,14,44,0.80)", border: "1px solid rgba(139,92,246,0.20)" }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 opacity-30 hover:opacity-70 transition-opacity"
      >
        <X size={15} />
      </button>

      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(167,139,250,0.60)" }}>
          Primeros pasos
        </p>
        <h2 className="font-black text-lg text-white">Configura tu club</h2>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {completedCount} de {STEPS.length} completados
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(completedCount / STEPS.length) * 100}%`,
              background: "linear-gradient(90deg, #7C3AED, #34D399)",
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const isDone = done[step.key as keyof typeof done];
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: isDone ? "rgba(52,211,153,0.05)" : step.bg,
                border: `1px solid ${isDone ? "rgba(52,211,153,0.15)" : step.border}`,
                opacity: isDone ? 0.6 : 1,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isDone ? "rgba(52,211,153,0.15)" : step.bg }}
              >
                {isDone
                  ? <CheckCircle2 size={18} style={{ color: "#34D399" }} />
                  : <Icon size={18} style={{ color: step.color }} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: isDone ? "rgba(255,255,255,0.50)" : "#fff" }}>
                  {step.title}
                </p>
                {!isDone && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {step.desc}
                  </p>
                )}
              </div>

              {!isDone && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 text-xs font-bold flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: step.color }}
                >
                  {step.cta} <ChevronRight size={12} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
