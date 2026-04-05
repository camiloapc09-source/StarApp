"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check, Loader2 } from "lucide-react";

interface Coach {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  branch?: string | null;
}

export function CoachEditButton({ coach }: { coach: Coach }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(coach.name);
  const [email, setEmail] = useState(coach.email);
  const [phone, setPhone] = useState(coach.phone ?? "");
  const [branch, setBranch] = useState(coach.branch ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function save() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/users/${coach.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone: phone || null, branch: branch || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Error al guardar");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-all hover:opacity-80"
        style={{ background: "var(--bg-elevated)" }}
        title="Editar"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Editar entrenador</h3>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)" }}>
                {error}
              </p>
            )}

            <div className="space-y-3">
              {[
                { label: "Nombre", value: name, onChange: setName },
                { label: "Email", value: email, onChange: setEmail },
                { label: "Teléfono", value: phone, onChange: setPhone },
                { label: "Sede", value: branch, onChange: setBranch },
              ].map(({ label, value, onChange }) => (
                <div key={label}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{label}</label>
                  <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={save}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CoachDeleteButton({ coachId, coachName }: { coachId: string; coachName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`¿Eliminar a "${coachName}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    await fetch(`/api/admin/users/${coachId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
      style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)" }}
      title="Eliminar"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
