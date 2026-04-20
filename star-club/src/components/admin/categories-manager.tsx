"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X, Users } from "lucide-react";

function fixText(s: string | null): string | null {
  if (!s) return s;
  return s
    .replace(/Ã³/g,"ó").replace(/Ã±/g,"ñ").replace(/Ã¡/g,"á")
    .replace(/Ã©/g,"é").replace(/Ã­/g,"í").replace(/Ãº/g,"ú")
    .replace(/Ã"/g,"Ó").replace(/Ã'/g,"Ñ").replace(/Ã!/g,"Á")
    .replace(/Ã‰/g,"É").replace(/Ã/g,"Í").replace(/Ãš/g,"Ú")
    .replace(/Ã¼/g,"ü").replace(/Ã¤/g,"ä");
}

type Category = {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  _count: { players: number };
};

type Props = { initialCategories: Category[] };

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", description: "", ageMin: 0, ageMax: 18 });
  const [newData, setNewData] = useState({ name: "", description: "", ageMin: 0, ageMax: 18 });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEdit(cat: Category) {
    setEditId(cat.id);
    setEditData({ name: cat.name, description: cat.description ?? "", ageMin: cat.ageMin, ageMax: cat.ageMax });
    setError(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/categories/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editData.name, description: editData.description || undefined, ageMin: editData.ageMin, ageMax: editData.ageMax }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((cs) => cs.map((c) => (c.id === editId ? { ...c, ...updated } : c)));
      setEditId(null);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los jugadores asignados quedarán sin categoría.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((cs) => cs.filter((c) => c.id !== id));
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al eliminar");
    }
    setLoading(false);
  }

  async function createCategory() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newData.name, description: newData.description || undefined, ageMin: newData.ageMin, ageMax: newData.ageMax }),
    });
    if (res.ok) {
      const created = await res.json();
      setCategories((cs) => [...cs, { ...created, _count: { players: 0 } }]);
      setNewData({ name: "", description: "", ageMin: 0, ageMax: 18 });
      setShowNew(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear");
    }
    setLoading(false);
  }

  const fieldCls = "rounded-xl px-3 py-2 text-sm outline-none border w-full";
  const fieldStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--error-subtle)", color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* Existing categories */}
      {categories.map((cat) =>
        editId === cat.id ? (
          <div key={cat.id} className="p-4 rounded-2xl border space-y-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input className={`${fieldCls} col-span-2`} style={fieldStyle} value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Nombre *" />
              <input className={fieldCls} style={fieldStyle} type="number" min={0} max={99} value={editData.ageMin} onChange={(e) => setEditData({ ...editData, ageMin: Number(e.target.value) })} placeholder="Edad mín" />
              <input className={fieldCls} style={fieldStyle} type="number" min={0} max={99} value={editData.ageMax} onChange={(e) => setEditData({ ...editData, ageMax: Number(e.target.value) })} placeholder="Edad máx" />
            </div>
            <input className={`${fieldCls}`} style={fieldStyle} value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Descripción opcional" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditId(null)} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                <X size={14} /> Cancelar
              </button>
              <button onClick={saveEdit} disabled={loading || !editData.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "#000" }}>
                <Check size={14} /> Guardar
              </button>
            </div>
          </div>
        ) : (
          <div key={cat.id} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{cat.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {cat.ageMin}–{cat.ageMax} años{cat.description ? ` · ${fixText(cat.description)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Users size={14} />
              <span>{cat._count.players}</span>
            </div>
            <button onClick={() => startEdit(cat)} className="p-2 rounded-xl hover:opacity-70 transition-opacity" style={{ color: "var(--text-secondary)" }}>
              <Pencil size={15} />
            </button>
            <button onClick={() => deleteCategory(cat.id)} disabled={loading} className="p-2 rounded-xl hover:opacity-70 transition-opacity disabled:opacity-30" style={{ color: "var(--error)" }}>
              <Trash2 size={15} />
            </button>
          </div>
        )
      )}

      {/* New category form */}
      {showNew ? (
        <div className="p-4 rounded-2xl border space-y-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--info)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input className={`${fieldCls} col-span-2`} style={fieldStyle} value={newData.name} onChange={(e) => setNewData({ ...newData, name: e.target.value })} placeholder="Nombre de la categoría *" />
            <input className={fieldCls} style={fieldStyle} type="number" min={0} max={99} value={newData.ageMin} onChange={(e) => setNewData({ ...newData, ageMin: Number(e.target.value) })} placeholder="Edad mín" />
            <input className={fieldCls} style={fieldStyle} type="number" min={0} max={99} value={newData.ageMax} onChange={(e) => setNewData({ ...newData, ageMax: Number(e.target.value) })} placeholder="Edad máx" />
          </div>
          <input className={fieldCls} style={fieldStyle} value={newData.description} onChange={(e) => setNewData({ ...newData, description: e.target.value })} placeholder="Descripción opcional" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              <X size={14} /> Cancelar
            </button>
            <button onClick={createCategory} disabled={loading || !newData.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: "var(--info)", color: "#fff" }}>
              <Check size={14} /> Crear categoría
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-medium transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
        >
          <Plus size={16} /> Agregar categoría
        </button>
      )}
    </div>
  );
}
