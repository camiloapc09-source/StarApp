"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

type Category = { id: string; name: string };
type Coach    = { id: string; name: string };

interface SessionData {
  id: string;
  title: string;
  type: string;
  date: string; // ISO string
  notes: string | null;
  categoryId: string | null;
  coachId: string | null;
  location: string | null;
}

interface Props {
  session: SessionData;
  categories: Category[];
  coaches?: Coach[];
  userRole?: string;
  locations?: string[];
}

const TYPE_OPTIONS_ALL = [
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "MATCH",    label: "Partido amistoso" },
  { value: "EVENT",    label: "Evento / Torneo" },
];

export default function EditSessionButton({ session, categories, coaches = [], userRole, locations = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [type, setType]   = useState(session.type);
  const [date, setDate]   = useState(() => {
    // Convert UTC ISO → local datetime-local format for the input
    const d = new Date(session.date);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [notes,      setNotes]      = useState(session.notes ?? "");
  const [categoryId, setCategoryId] = useState(session.categoryId ?? "");
  const [coachId,    setCoachId]    = useState(session.coachId ?? "");
  const [location,   setLocation]   = useState(session.location ?? "");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const typeOptions = userRole === "ADMIN" ? TYPE_OPTIONS_ALL : TYPE_OPTIONS_ALL.filter((t) => t.value !== "EVENT");

  async function handleSave() {
    if (!title.trim()) { setError("El título no puede estar vacío."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type,
        date,
        notes: notes.trim() || null,
        categoryId: categoryId || null,
        location: location || null,
        ...(userRole === "ADMIN" && { coachId: coachId || null }),
      }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-xl transition-all hover:bg-[var(--bg-hover)]"
        title="Editar sesión"
        style={{ color: "var(--text-muted)" }}
      >
        <Pencil size={14} />
      </button>

      {open && (
        /* Backdrop */
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Modal card */}
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
              <h2 className="font-semibold text-sm">Editar sesión</h2>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la sesión"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              />

              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              />

              {/* Type */}
              <div className="flex gap-2">
                {typeOptions.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                    style={type === t.value
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                      : { background: "transparent", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Category */}
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

              {/* Location / sede */}
              {locations.length > 0 && (
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                >
                  <option value="">Sede (todas)</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}

              {/* Coach — admin only */}
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

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas opcionales"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              />

              {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl text-sm border transition-all hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center gap-2"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                <Check size={14} />
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
