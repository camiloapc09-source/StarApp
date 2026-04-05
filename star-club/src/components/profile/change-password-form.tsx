"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Check, Loader2 } from "lucide-react";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (next.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cambiar contraseña");
      setSaved(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors focus:border-[var(--accent)] pr-12";
  const inputStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Cambiar contraseña
      </h3>

      <div className="relative">
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          <Lock size={12} className="inline mr-1" />Contraseña actual
        </label>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className={inputCls}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
          >
            {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className={inputCls}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowNext((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
          >
            {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className={inputCls}
          style={confirm && confirm !== next ? { ...inputStyle, borderColor: "var(--error)" } : inputStyle}
        />
        {confirm && confirm !== next && (
          <p className="text-xs mt-1" style={{ color: "var(--error)" }}>Las contraseñas no coinciden</p>
        )}
      </div>

      {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all"
          style={{ background: saved ? "var(--success)" : "var(--accent)", color: "#000" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
          {saving ? "Guardando..." : saved ? "Contraseña actualizada" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
