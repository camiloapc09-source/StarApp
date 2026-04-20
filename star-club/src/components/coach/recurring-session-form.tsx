"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addWeeks, addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { RepeatIcon, CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  categories: { id: string; name: string }[];
  coaches?: { id: string; name: string }[];
  userRole?: string;
};

const DAYS_OF_WEEK = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

/** Returns the next occurrence of `dayOfWeek` (0=Sun…6=Sat) on or after `from`. */
function nextOccurrence(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export default function RecurringSessionForm({ categories, coaches = [], userRole }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("TRAINING");
  const [categoryId, setCategoryId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [time, setTime] = useState("08:00");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weeks, setWeeks] = useState(4);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [created, setCreated] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  /** Build the list of dates to create */
  function buildDates(): Date[] {
    if (selectedDays.length === 0) return [];
    const start = parseISO(startDate);
    const dates: Date[] = [];

    for (const dayOfWeek of selectedDays) {
      let current = nextOccurrence(start, dayOfWeek);
      const step = frequency === "biweekly" ? 2 : 1;
      // keep going until we've gone `weeks` weeks past startDate
      const cutoff = addWeeks(start, weeks);
      while (current <= cutoff) {
        const d = new Date(current);
        const [h, m] = time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        dates.push(d);
        current = addWeeks(current, step);
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  const preview = buildDates();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Escribe un título.");
    if (preview.length === 0) return setError("Selecciona al menos un día.");
    setLoading(true);
    setError(null);
    let count = 0;
    for (const d of preview) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          date: d.toISOString().slice(0, 16),
          categoryId: categoryId || null,
          coachId: coachId || null,
        }),
      });
      if (res.ok) count++;
    }
    setCreated(count);
    setLoading(false);
    if (count > 0) {
      setDone(true);
      setTimeout(() => { router.refresh(); setDone(false); setTitle(""); setSelectedDays([]); }, 2000);
    } else {
      setError("No se pudo crear ninguna sesión.");
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-2">
        <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
        <span className="text-sm font-medium">{created} sesiones creadas.</span>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all";
  const inputStyle = {
    background: "var(--bg-elevated)",
    borderColor: "var(--border-primary)",
    color: "var(--text-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title + type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ej. Entrenamiento Sub-12)"
          required
          className={inputCls}
          style={inputStyle}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="TRAINING">Entrenamiento</option>
          <option value="MATCH">Partido amistoso</option>
          {userRole === "ADMIN" && <option value="EVENT">Evento/Torneo</option>}
        </select>
      </div>

      {/* Category + coach */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {coaches.length > 0 && (
          <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Sin entrenador asignado</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Days of week */}
      <div>
        <p className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>
          Días de la semana
        </p>
        <div className="flex gap-2 flex-wrap">
          {DAYS_OF_WEEK.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className="w-11 h-11 rounded-xl text-xs font-bold transition-all"
              style={{
                background: selectedDays.includes(d.value) ? "rgba(139,92,246,0.20)" : "var(--bg-elevated)",
                border: `1px solid ${selectedDays.includes(d.value) ? "rgba(139,92,246,0.40)" : "var(--border-primary)"}`,
                color: selectedDays.includes(d.value) ? "#C4B5FD" : "var(--text-muted)",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time + start + weeks + frequency */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Desde</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Semanas</label>
          <input
            type="number" min={1} max={52} value={weeks}
            onChange={(e) => setWeeks(Math.max(1, Math.min(52, Number(e.target.value))))}
            className={inputCls} style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Frecuencia</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as "weekly" | "biweekly")} className={inputCls} style={inputStyle}>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
          </select>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "#C4B5FD" }}>
            Se crearán {preview.length} sesiones:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-auto">
            {preview.map((d, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg font-medium"
                style={{ background: "rgba(139,92,246,0.12)", color: "#C4B5FD" }}>
                {format(d, "EEE d MMM", { locale: es })}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", color: "var(--error)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || preview.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: "rgba(139,92,246,0.15)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.30)" }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RepeatIcon size={14} />}
        {loading ? `Creando sesiones…` : `Crear ${preview.length > 0 ? preview.length : ""} sesiones`}
      </button>
    </form>
  );
}
