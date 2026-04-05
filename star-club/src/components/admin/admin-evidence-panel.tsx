"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, Zap, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type EvidenceItem = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string | null;
  submittedAt: string | Date;
  verifiedAt: string | Date | null;
  status: string;
  notes: string | null;
  player: { user: { name: string; avatar: string | null } };
  playerMission: { mission: { title: string; xpReward: number } } | null;
};

type Props = {
  initialPending: EvidenceItem[];
  initialRecent: EvidenceItem[];
};

export default function AdminEvidencePanel({ initialPending, initialRecent }: Props) {
  const [pending, setPending] = useState<EvidenceItem[]>(initialPending);
  const [recent, setRecent] = useState<EvidenceItem[]>(initialRecent);
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function act(id: string, action: "accept" | "reject") {
    setLoading(id);
    const res = await fetch("/api/evidence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    if (res.ok) {
      const item = pending.find((e) => e.id === id);
      if (item) {
        setRecent((r) => [{ ...item, status: action === "accept" ? "ACCEPTED" : "REJECTED", verifiedAt: new Date() }, ...r].slice(0, 20));
        setPending((p) => p.filter((e) => e.id !== id));
      }
    }
    setLoading(null);
  }

  async function acceptAll() {
    if (!confirm(`¿Aceptar las ${pending.length} evidencias pendientes?`)) return;
    setLoading("all");
    const res = await fetch("/api/evidence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acceptAll" }),
    });
    if (res.ok) {
      setRecent((r) => [...pending.map((e) => ({ ...e, status: "ACCEPTED", verifiedAt: new Date() })), ...r].slice(0, 20));
      setPending([]);
    }
    setLoading(null);
  }

  const isImage = (mime: string | null) => mime?.startsWith("image/") ?? true;

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: "var(--success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            No hay evidencias pendientes. ¡Todo al día!
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={acceptAll}
              disabled={loading === "all"}
              className="text-sm px-4 py-2 rounded-xl font-semibold disabled:opacity-40"
              style={{ background: "var(--success)", color: "#fff" }}
            >
              {loading === "all" ? "Procesando..." : `Aceptar todas (${pending.length})`}
            </button>
          </div>

          <div className="space-y-3">
            {pending.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-4 p-4 rounded-2xl border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
              >
                {/* Thumbnail */}
                <button
                  onClick={() => setPreview(ev.url)}
                  className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border relative group"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  {isImage(ev.mimeType) ? (
                    <img src={ev.url} alt="evidencia" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                      Archivo
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink size={16} className="text-white" />
                  </div>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={ev.player.user.name} src={ev.player.user.avatar} size="sm" />
                    <span className="text-sm font-semibold">{ev.player.user.name}</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {ev.playerMission?.mission.title ?? "—"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>
                      <Zap size={11} /> +{ev.playerMission?.mission.xpReward ?? 0} XP
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <Clock size={11} />
                      {format(new Date(ev.submittedAt), "dd MMM, HH:mm", { locale: es })}
                    </span>
                  </div>
                  {ev.notes && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>"{ev.notes}"</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => act(ev.id, "reject")}
                    disabled={loading === ev.id}
                    className="p-2.5 rounded-xl border transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ borderColor: "var(--error)", color: "var(--error)" }}
                    title="Rechazar"
                  >
                    <XCircle size={18} />
                  </button>
                  <button
                    onClick={() => act(ev.id, "accept")}
                    disabled={loading === ev.id}
                    className="p-2.5 rounded-xl transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ background: "var(--success)", color: "#fff" }}
                    title="Aceptar"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent reviewed */}
      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            Revisadas recientemente
          </h3>
          <div className="space-y-2">
            {recent.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl"
                style={{ background: "var(--bg-elevated)" }}
              >
                <Avatar name={ev.player.user.name} src={ev.player.user.avatar} size="sm" />
                <span className="text-sm flex-1 truncate">{ev.player.user.name}</span>
                <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {ev.playerMission?.mission.title ?? "—"}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={ev.status === "ACCEPTED"
                    ? { background: "rgba(0,255,135,0.1)", color: "var(--success)" }
                    : { background: "rgba(255,71,87,0.1)", color: "var(--error)" }}
                >
                  {ev.status === "ACCEPTED" ? "Aceptada" : "Rechazada"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="preview"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
