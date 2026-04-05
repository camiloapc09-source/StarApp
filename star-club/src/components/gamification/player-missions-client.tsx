"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap, Upload, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";

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
  latestEvidenceStatus: string | null; // PENDING | ACCEPTED | REJECTED | null
};

export default function PlayerMissionsClient({ missions }: { missions: Mission[] }) {
  const router = useRouter();
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [uploading,  setUploading]  = useState<string | null>(null);
  const [statuses,   setStatuses]   = useState<Record<string, string | null>>(
    Object.fromEntries(missions.map((m) => [m.playerMissionId, m.latestEvidenceStatus]))
  );
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function uploadEvidence(pmId: string, file: File) {
    setUploading(pmId);
    setErrors((e) => ({ ...e, [pmId]: "" }));

    const toBase64 = (f: File) =>
      new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(f);
        r.onload  = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
      });

    const data = await toBase64(file);
    const res = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerMissionId: pmId,
        filename: file.name,
        mimeType: file.type,
        data,
      }),
    });

    if (res.ok) {
      setStatuses((s) => ({ ...s, [pmId]: "PENDING" }));
      setExpanded(null);
      router.refresh();
    } else {
      const d = await res.json();
      setErrors((e) => ({ ...e, [pmId]: d.error ?? "Error al subir evidencia" }));
    }
    setUploading(null);
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
      {missions.map((m) => {
        const evStatus = statuses[m.playerMissionId];
        const isExpanded = expanded === m.playerMissionId;

        return (
          <div
            key={m.playerMissionId}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            {/* Mission row */}
            <div className="flex items-start gap-3 p-4">
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

              {/* XP + evidence status */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>
                  <Zap size={11} /> +{m.xpReward}
                </span>

                {evStatus === "PENDING" && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--warning)" }}>
                    <Clock size={11} /> Revisando
                  </span>
                )}
                {evStatus === "ACCEPTED" && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
                    <CheckCircle2 size={11} /> Aceptada
                  </span>
                )}
                {evStatus === "REJECTED" && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : m.playerMissionId)}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--error)" }}
                  >
                    <XCircle size={11} /> Rechazada · reintentar
                  </button>
                )}
                {!evStatus && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : m.playerMissionId)}
                    className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                    style={{ color: "var(--info)" }}
                  >
                    <Upload size={11} /> Subir evidencia
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}
              </div>
            </div>

            {/* Upload section */}
            {isExpanded && (
              <div
                className="px-4 pb-4 pt-0 border-t"
                style={{ borderColor: "var(--border-primary)" }}
              >
                <p className="text-xs mt-3 mb-2" style={{ color: "var(--text-muted)" }}>
                  Sube una foto o archivo como evidencia de que completaste la misión.
                </p>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf"
                  ref={(el) => { fileRefs.current[m.playerMissionId] = el; }}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await uploadEvidence(m.playerMissionId, file);
                  }}
                />
                <button
                  onClick={() => fileRefs.current[m.playerMissionId]?.click()}
                  disabled={uploading === m.playerMissionId}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
                  style={{ background: "var(--info)", color: "#fff" }}
                >
                  <Upload size={14} />
                  {uploading === m.playerMissionId ? "Subiendo..." : "Seleccionar archivo"}
                </button>
                {errors[m.playerMissionId] && (
                  <p className="text-xs mt-2" style={{ color: "var(--error)" }}>{errors[m.playerMissionId]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
