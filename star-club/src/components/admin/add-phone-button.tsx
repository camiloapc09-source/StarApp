"use client";

/**
 * Agregar el celular de un deportista sin salir de la pantalla de cobros.
 *
 * Antes, cuando faltaba el número, el botón de WhatsApp simplemente no
 * aparecía. El admin no tenía forma de saber que el problema era un dato
 * faltante, ni dónde arreglarlo: había que ir a la ficha del jugador,
 * editarla, guardar y volver.
 */

import { useState } from "react";
import { PhoneOff, Check, Loader2, X } from "lucide-react";

interface Props {
  playerId: string;
  playerName: string;
  onSaved?: () => void;
}

export default function AddPhoneButton({ playerId, playerName, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setError("Escribe un número válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar");
      }
      setOpen(false);
      setPhone("");
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${playerName} no tiene celular registrado`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.45)",
          border: "1px dashed rgba(255,255,255,0.18)",
        }}
      >
        <PhoneOff size={13} /> Falta celular — agregar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        autoFocus
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => { setPhone(e.target.value); setError(null); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="300 123 4567"
        className="rounded-xl px-3 py-1.5 text-xs outline-none border w-36"
        style={{
          background: "var(--bg-elevated)",
          borderColor: error ? "var(--error)" : "rgba(255,255,255,0.15)",
          color: "var(--text-primary)",
        }}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex items-center justify-center p-1.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
        style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.30)" }}
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null); }}
        className="flex items-center justify-center p-1.5 rounded-xl transition-all hover:opacity-80"
        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <X size={13} />
      </button>
      {error && <span className="text-[11px]" style={{ color: "var(--error)" }}>{error}</span>}
    </div>
  );
}
