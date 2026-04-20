"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Clock } from "lucide-react";

type Player = { id: string; user: { name: string; avatar?: string | null } };

const STATUS_OPTIONS = [
  { key: "PRESENT", Icon: Check,  label: "Presente", activeColor: "#34D399", activeBg: "rgba(52,211,153,0.18)" },
  { key: "LATE",    Icon: Clock,  label: "Tarde",    activeColor: "#FCD34D", activeBg: "rgba(251,191,36,0.18)" },
  { key: "ABSENT",  Icon: X,      label: "Ausente",  activeColor: "#F87171", activeBg: "rgba(239,68,68,0.18)"  },
] as const;

export default function AttendanceForm({
  sessionId,
  players,
  initialAttendances,
  t,
}: {
  sessionId: string;
  players: Player[];
  initialAttendances: { playerId: string; status: string }[];
  t: any;
}) {
  const initial: Record<string, string> = {};
  (initialAttendances || []).forEach((a) => (initial[a.playerId] = a.status));

  const [statuses, setStatuses] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(playerId: string, status: string) {
    setStatuses((s) => ({ ...s, [playerId]: status }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const attendances = players.map((p) => ({
        playerId: p.id,
        status: statuses[p.id] || "ABSENT",
      }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, attendances }),
      });
      if (res.ok) setSaved(true);
      else setError(t?.attendance?.saveError ?? "Error al guardar. Intenta de nuevo.");
    } catch {
      setError(t?.attendance?.saveError ?? "Error al guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function markAll(status: string) {
    const all: Record<string, string> = {};
    players.forEach((p) => (all[p.id] = status));
    setStatuses(all);
    setSaved(false);
  }

  const presentCount = players.filter((p) => statuses[p.id] === "PRESENT").length;
  const lateCount    = players.filter((p) => statuses[p.id] === "LATE").length;
  const absentCount  = players.filter((p) => !statuses[p.id] || statuses[p.id] === "ABSENT").length;

  return (
    <div className="space-y-4">
      {players.length === 0 ? (
        <Card>
          <div className="p-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No hay deportistas disponibles para esta sesión.
          </div>
        </Card>
      ) : (
        <>
          {/* Bulk actions + summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => markAll("PRESENT")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(52,211,153,0.14)", color: "#34D399", border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <Check size={12} strokeWidth={2.5} /> Todos presentes
            </button>
            <button
              onClick={() => markAll("ABSENT")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.10)", color: "#F87171", border: "1px solid rgba(239,68,68,0.20)" }}
            >
              <X size={12} strokeWidth={2.5} /> Todos ausentes
            </button>
            <div className="ml-auto flex gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-xl" style={{ background: "rgba(52,211,153,0.10)", color: "#34D399" }}>✓ {presentCount}</span>
              <span className="px-2.5 py-1 rounded-xl" style={{ background: "rgba(251,191,36,0.10)", color: "#FCD34D" }}>⏰ {lateCount}</span>
              <span className="px-2.5 py-1 rounded-xl" style={{ background: "rgba(239,68,68,0.10)", color: "#F87171" }}>✗ {absentCount}</span>
            </div>
          </div>

          {/* Player rows */}
          <div className="space-y-2">
            {players.map((p) => {
              const current = statuses[p.id] || "ABSENT";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  <Avatar name={p.user.name} src={p.user.avatar ?? undefined} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.user.name}</p>
                  </div>
                  {/* 3 quick-tap buttons */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {STATUS_OPTIONS.map(({ key, Icon, label, activeColor, activeBg }) => {
                      const active = current === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setStatus(p.id, key)}
                          title={label}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                          style={{
                            background: active ? activeBg : "var(--bg-elevated)",
                            border: `1.5px solid ${active ? activeColor : "var(--border-primary)"}`,
                            color: active ? activeColor : "rgba(255,255,255,0.25)",
                          }}
                        >
                          <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 space-y-2">
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar asistencia"}
            </Button>
            {saved && (
              <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
                ✓ Asistencia guardada correctamente
              </p>
            )}
            {error && (
              <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
