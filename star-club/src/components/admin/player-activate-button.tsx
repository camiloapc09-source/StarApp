"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

type Props = { playerId: string; playerName: string; dateOfBirth?: string | null };

export default function PlayerActivateButton({ playerId, playerName, dateOfBirth }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; ageMin: number; ageMax: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openModal() {
    setOpen(true);
    const res = await fetch("/api/categories");
    if (res.ok) {
      const cats: { id: string; name: string; ageMin: number; ageMax: number }[] = await res.json();
      setCategories(cats);
      if (dateOfBirth) {
        const today = new Date();
        const birth = new Date(dateOfBirth);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        const match = cats.find((c) => age >= c.ageMin && age <= c.ageMax);
        if (match) setCategoryId(match.id);
      }
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return setError("Ingresa el monto mensual.");
    if (!joinDate) return setError("Selecciona la fecha de ingreso.");
    setLoading(true);
    setError(null);
    try {
      const join = new Date(joinDate);
      const paymentDay = join.getDate();

      const patchBody: Record<string, unknown> = {
        status: "ACTIVE",
        paymentDay,
        monthlyAmount: parseFloat(amount),
        joinDate,
      };
      if (categoryId) patchBody.categoryId = categoryId;

      const r1 = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!r1.ok) throw new Error("Error al activar jugador");

      const now = new Date();
      let dueDate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
      if (dueDate <= now) dueDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);

      const r2 = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          amount: parseFloat(amount),
          concept: "Mensualidad",
          dueDate: dueDate.toISOString(),
        }),
      });
      if (!r2.ok) throw new Error("Jugador activado pero error al crear pago");

      setDone(true);
      setTimeout(() => { window.location.reload(); }, 1600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        Activar jugador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Activar deportista</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{playerName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 size={40} style={{ color: "var(--success)" }} />
                <p className="font-semibold">Jugador activado</p>
                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  Primera mensualidad generada. El dia de pago sera el {new Date(joinDate).getDate()} de cada mes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                    FECHA DE INGRESO (define el dia de pago)
                  </label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  />
                  {joinDate && (
                    <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
                      Dia de pago mensual: el {new Date(joinDate).getDate()} de cada mes
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                    MONTO MENSUAL (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 80000"
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  />
                </div>
                {categories.length > 0 && (
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      CATEGORIA (opcional)
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    >
                      <option value="">Sin categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    {loading ? "Activando..." : "Activar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
