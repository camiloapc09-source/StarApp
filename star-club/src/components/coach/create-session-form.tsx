"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

const ALL_TYPE_OPTIONS = [
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "MATCH",    label: "Partido amistoso" },
  { value: "EVENT",    label: "Evento/Torneo", adminOnly: true },
];

type Props = {
  categories: { id: string; name: string }[];
  userRole?: string;
  coaches?: { id: string; name: string }[];
};

export default function CreateSessionForm({ categories, userRole, coaches = [] }: Props) {
  const TYPE_OPTIONS = ALL_TYPE_OPTIONS.filter((t) => !t.adminOnly || userRole === "ADMIN");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("TRAINING");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [categoryId, setCategoryId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Escribe un título para la sesión.");
    setLoading(true);
    setError(null);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type,
        date,
        categoryId: categoryId || null,
        coachId: coachId || null,
        notes: notes.trim() || undefined,
      }),
    });
    if (res.ok) {
      setDone(true);
      setTimeout(() => { router.refresh(); setDone(false); setTitle(""); setNotes(""); }, 1200);
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al crear sesión");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-2">
        <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
        <span className="text-sm font-medium">Sesión creada.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la sesión"
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        />
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type selector */}
        <div className="flex gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={type === t.value
                ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category selector */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Coach selector — admin only */}
      {userRole === "ADMIN" && coaches.length > 0 && (
        <select
          value={coachId}
          onChange={(e) => setCoachId(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        >
          <option value="">Sin entrenador asignado</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      <div className="flex gap-3 items-start">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas opcionales"
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex-shrink-0"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Creando..." : "Crear sesión"}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
    </form>
  );
}
