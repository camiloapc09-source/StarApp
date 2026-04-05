"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, X, Bell } from "lucide-react";

export default function SendNotificationForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("INFO");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type, target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setSent(data.sent);
      setTitle(""); setMessage("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  const targets = [
    { value: "all",     label: "Todos los usuarios" },
    { value: "players", label: "Solo jugadores" },
    { value: "parents", label: "Solo padres / acudientes" },
    { value: "coaches", label: "Solo entrenadores" },
  ];

  const types = [
    { value: "INFO",       label: "Informacion",  color: "var(--accent)" },
    { value: "ALERT",      label: "Alerta",       color: "var(--error)" },
    { value: "PAYMENT",    label: "Pago",         color: "var(--warning)" },
    { value: "ATTENDANCE", label: "Asistencia",  color: "#818cf8" },
  ];

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell size={15} style={{ color: "var(--accent)" }} />
        <h3 className="text-sm font-semibold">Enviar notificacion</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Target */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>DESTINATARIOS</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} style={inputStyle}>
            {targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>TIPO</label>
          <div className="flex gap-2 flex-wrap pt-1">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                style={type === t.value
                  ? { background: t.color, color: "#000", borderColor: t.color }
                  : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>TITULO</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ej: Cambio de horario" className={inputCls} style={inputStyle} />
        </div>

        {/* Message */}
        <div className="sm:col-span-2">
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>MENSAJE</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={500}
            rows={3}
            placeholder="Escribe el mensaje aqui..."
            className={inputCls}
            style={inputStyle}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>{message.length}/500</p>
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

      {sent !== null && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(0,255,135,0.08)", color: "var(--success)" }}>
          <CheckCircle2 size={15} />
          Notificacion enviada a {sent} usuario{sent !== 1 ? "s" : ""}.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !title || !message}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          <Send size={14} />
          {sending ? "Enviando..." : "Enviar notificacion"}
        </button>
      </div>
    </form>
  );
}
