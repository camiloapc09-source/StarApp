"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle2, Loader2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  CHALLENGE: "Reto",
  SPECIAL: "Especial",
};

const TYPE_COLORS: Record<string, string> = {
  DAILY:     "rgba(59,130,246,0.15)",
  WEEKLY:    "rgba(245,158,11,0.15)",
  CHALLENGE: "rgba(239,68,68,0.15)",
  SPECIAL:   "rgba(0,255,135,0.15)",
};

type Mission = {
  playerMissionId: string;
  missionId: string;
  title: string;
  description: string;
  xpReward: number;
  type: string;
  progress: number;
  target: number;
  latestEvidenceStatus: string | null;
};

export default function PlayerMissionsClient({ missions }: { missions: Mission[] }) {
  const router = useRouter();
  const [completing, setCompleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function completeMission(pmId: string) {
    setCompleting(pmId);
    setErrors((e) => ({ ...e, [pmId]: "" }));

    const res = await fetch("/api/gamification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete-mission", playerMissionId: pmId }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json();
      setErrors((e) => ({ ...e, [pmId]: d.error ?? "Error al completar" }));
    }
    setCompleting(null);
  }

  if (missions.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
        No tienes misiones activas en este momento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {missions.map((m) => (
        <div
          key={m.playerMissionId}
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-start gap-3">
            {/* Type badge */}
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: TYPE_COLORS[m.type] ?? "#eee", color: "var(--text-secondary)" }}
            >
              {TYPE_LABELS[m.type] ?? m.type}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{m.description}</p>

              {/* Progress bar (if target > 1) */}
              {m.target > 1 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>{m.progress} / {m.target}</span>
                    <span>{Math.round((m.progress / m.target) * 100)}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "var(--bg-card)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(m.progress / m.target) * 100}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* XP */}
            <span className="flex items-center gap-1 text-xs font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>
              <Zap size={11} /> +{m.xpReward}
            </span>
          </div>

          {/* Complete button */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-primary)" }}>
            <button
              onClick={() => completeMission(m.playerMissionId)}
              disabled={completing === m.playerMissionId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center disabled:opacity-50 transition-all"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {completing === m.playerMissionId
                ? <><Loader2 size={14} className="animate-spin" /> Completando...</>
                : <><CheckCircle2 size={14} /> Ya lo hice</>
              }
            </button>
            {errors[m.playerMissionId] && (
              <p className="text-xs mt-2 text-center" style={{ color: "var(--error)" }}>{errors[m.playerMissionId]}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
