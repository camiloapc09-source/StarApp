"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Star, Loader2, Check, X } from "lucide-react";

type Reward = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  levelRequired: number;
  _count: { playerRewards: number };
};

const empty = { title: "", description: "", icon: "🏆", levelRequired: 1 };

export default function RewardsManager({ initial }: { initial: Reward[] }) {
  const [items, setItems]       = useState<Reward[]>(initial);
  const [form, setForm]         = useState({ ...empty });
  const [editing, setEditing]   = useState<string | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const inputCls   = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  async function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Título y descripción son requeridos.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, levelRequired: Number(form.levelRequired) }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((i) => [...i, { ...created, _count: { playerRewards: 0 } }].sort((a, b) => a.levelRequired - b.levelRequired));
      setForm({ ...empty });
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear recompensa");
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/rewards/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, levelRequired: Number(form.levelRequired) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((i) => i.map((r) => r.id === editing ? { ...r, ...updated } : r));
      setForm({ ...empty });
      setEditing(null);
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al actualizar");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta recompensa?")) return;
    setLoading(id);
    const res = await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((i) => i.filter((r) => r.id !== id));
    }
    setLoading(null);
  }

  function handleEdit(r: Reward) {
    setEditing(r.id);
    setForm({ title: r.title, description: r.description, icon: r.icon ?? "🏆", levelRequired: r.levelRequired });
    setShowForm(true);
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
          <Star size={15} style={{ color: "var(--warning)" }} />
          <span className="text-sm font-semibold">Recompensas ({items.length})</span>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setForm({ ...empty }); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.3)" }}
          >
            <Plus size={13} /> Nueva recompensa
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
            {editing ? "Editar recompensa" : "Nueva recompensa"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ícono</label>
              <input className={inputCls} style={{ ...inputStyle, maxWidth: "5rem" }} value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Nivel requerido</label>
              <input type="number" min={1} max={100} className={inputCls} style={inputStyle} value={form.levelRequired}
                onChange={(e) => setForm((f) => ({ ...f, levelRequired: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Título *</label>
              <input className={inputCls} style={inputStyle} value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Jugador del mes" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Descripción *</label>
              <textarea className={inputCls} style={inputStyle} rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción de la recompensa" />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={editing ? handleUpdate : handleCreate} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--warning)", color: "#000" }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear recompensa"}
            </button>
            <button onClick={cancelForm} className="px-3 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}>
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.length === 0 ? (
          <p className="col-span-2 text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Sin recompensas. Crea la primera arriba.
          </p>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(255,184,0,0.10)" }}
              >
                {r.icon ?? "🏆"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Nivel {r.levelRequired} · {r._count.playerRewards} ganadores
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg border transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(r.id)} disabled={loading === r.id}
                  className="p-1.5 rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ borderColor: "var(--error)", color: "var(--error)" }}>
                  {loading === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
