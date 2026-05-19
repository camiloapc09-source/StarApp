"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";

export default function RaffleCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prize, setPrize] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [drawDate, setDrawDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !ticketPrice) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          prize: prize || null,
          ticketPrice: parseFloat(ticketPrice),
          drawDate: drawDate || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al crear la rifa");
        return;
      }
      setOpen(false);
      setTitle(""); setDescription(""); setPrize(""); setTicketPrice(""); setDrawDate("");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{ background: "rgba(139,92,246,0.10)", color: "#DEC4FF", borderColor: "rgba(139,92,246,0.30)" }}
      >
        <Ticket size={15} />
        + Nueva rifa
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.20)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Ticket size={15} style={{ color: "#DEC4FF" }} />
        <h3 className="text-sm font-bold" style={{ color: "#DEC4FF" }}>Nueva rifa</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            Nombre de la rifa *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Rifa Cena de Gala 2026"
            required
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            Premio / ¿Qué se rifá?
          </label>
          <input
            type="text"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="Ej: Cena para 2 personas + noche de hotel"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            Descripción / instrucciones
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Información adicional, cómo participar, fecha de sorteo..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Valor por número *
            </label>
            <input
              type="number"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              placeholder="10000"
              min={1}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Fecha de sorteo
            </label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-primary)",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,71,87,0.10)", color: "#ff4757" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(139,92,246,0.25)", color: "#DEC4FF", border: "1px solid rgba(139,92,246,0.40)" }}
          >
            {loading ? "Creando..." : "Crear rifa"}
          </button>
        </div>
      </form>
    </div>
  );
}
