"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, CheckCircle2, XCircle, Zap, Target, Loader2, Check, X } from "lucide-react";

type Mission = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: string;
  icon: string | null;
  isActive: boolean;
  _count: { playerMissions: number };
};

const TYPES = ["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"] as const;
const TYPE_LABELS: Record<string, string> = {
  DAILY:     "Diaria",
  WEEKLY:    "Semanal",
  CHALLENGE: "Reto",
  SPECIAL:   "Especial",
};

const empty = { title: "", description: "", xpReward: 50, type: "DAILY", icon: "🎯" };

export default function MissionsManager({ initial }: { initial: Mission[] }) {
  const router  = useRouter();
  const [items, setItems]       = useState<Mission[]>(initial);
  const [form, setForm]         = useState({ ...empty });
  const [editing, setEditing]   = useState<string | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const inputCls   = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  async function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Título y descripción son requeridos.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, xpReward: Number(form.xpReward) }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((i) => [{ ...created, _count: { playerMissions: 0 } }, ...i]);
      setForm({ ...empty });
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear misión");
    }
    setCreating(false);
  }

  async function handleToggle(id: string, isActive: boolean) {
    setLoading(id);
    const res = await fetch(`/api/missions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setItems((i) => i.map((m) => m.id === id ? { ...m, isActive: !m.isActive } : m));
    }
    setLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta misión?")) return;
    setLoading(`del-${id}`);
    const res = await fetch(`/api/missions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((i) => i.filter((m) => m.id !== id));
    }
    setLoading(null);
  }

  async function handleEdit(m: Mission) {
    setEditing(m.id);
    setForm({ title: m.title, description: m.description, xpReward: m.xpReward, type: m.type, icon: m.icon ?? "🎯" });
    setShowForm(true);
  }

  async function handleUpdate() {
    if (!editing) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/missions/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, xpReward: Number(form.xpReward) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((i) => i.map((m) => m.id === editing ? { ...m, ...updated } : m));
      setForm({ ...empty });
      setEditing(null);
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al actualizar");
    }
    setCreating(false);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ ...empty });
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold">Misiones ({items.filter((m) => m.isActive).length} activas)</span>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setForm({ ...empty }); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <Plus size={13} /> Nueva misión
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {editing ? "Editar misión" : "Nueva misión"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ícono</label>
              <input className={inputCls} style={{ ...inputStyle, maxWidth: "5rem" }} value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Tipo</label>
              <select className={inputCls} style={inputStyle} value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Título *</label>
              <input className={inputCls} style={inputStyle} value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Entrena 3 días seguidos" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Descripción *</label>
              <textarea className={inputCls} style={inputStyle} rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción de la misión" />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>XP a otorgar</label>
              <input type="number" min={1} max={1000} className={inputCls} style={inputStyle} value={form.xpReward}
                onChange={(e) => setForm((f) => ({ ...f, xpReward: Number(e.target.value) }))} />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={editing ? handleUpdate : handleCreate} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#000" }}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {creating ? "Guardando..." : editing ? "Actualizar" : "Crear misión"}
            </button>
            <button onClick={cancelForm} className="px-3 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}>
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Sin misiones todavía. Crea la primera arriba.
          </p>
        ) : (
          items.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-xl border transition-opacity"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-primary)",
                opacity: m.isActive ? 1 : 0.5,
              }}
            >
              <span className="text-xl">{m.icon ?? "🎯"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {TYPE_LABELS[m.type] ?? m.type} · {m._count.playerMissions} jugadores
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>
                <Zap size={11} /> +{m.xpReward}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(m.id, m.isActive)} disabled={loading === m.id}
                  className="p-1.5 rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ borderColor: m.isActive ? "var(--success)" : "var(--border-primary)", color: m.isActive ? "var(--success)" : "var(--text-muted)" }}
                  title={m.isActive ? "Desactivar" : "Activar"}>
                  {loading === m.id ? <Loader2 size={13} className="animate-spin" /> : m.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                </button>
                <button onClick={() => handleEdit(m)} className="p-1.5 rounded-lg border transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  title="Editar">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(m.id)} disabled={loading === `del-${m.id}`}
                  className="p-1.5 rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ borderColor: "var(--error)", color: "var(--error)" }}
                  title="Eliminar">
                  {loading === `del-${m.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
