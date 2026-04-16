"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check, Loader2, KeyRound } from "lucide-react";

const BRANCHES = ["Sede Norte", "Sede Sur"];

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
  // branch stored as comma-separated, parse into array
  const [branches, setBranches] = useState<string[]>(
    coach.branch ? coach.branch.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function toggleBranch(b: string) {
    setBranches((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  }

  async function save() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/users/${coach.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone: phone || null, branch: branches.join(",") || null }),
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

              {/* Multi-branch selection */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Sede(s)</label>
                <div className="flex gap-2 flex-wrap">
                  {BRANCHES.map((b) => {
                    const active = branches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBranch(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all"
                        style={{
                          background: active ? "var(--accent)" : "var(--bg-elevated)",
                          color: active ? "#000" : "var(--text-secondary)",
                          borderColor: active ? "var(--accent)" : "var(--border-primary)",
                        }}
                      >
                        {active && <Check size={11} strokeWidth={3} />}
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
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

export function CoachResetPasswordButton({ coachId, coachName }: { coachId: string; coachName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleReset() {
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return; }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/users/${coachId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Error al cambiar contraseña");
      return;
    }
    setSuccess(true);
    setTimeout(() => { setOpen(false); setSuccess(false); setPassword(""); }, 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-all hover:opacity-80"
        style={{ background: "var(--bg-elevated)" }}
        title="Cambiar contraseña"
      >
        <KeyRound size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cambiar contraseña</h3>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Entrenador: <strong>{coachName}</strong></p>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)" }}>{error}</p>
            )}
            {success && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(0,255,135,0.1)", color: "var(--success)" }}>Contraseña actualizada</p>
            )}

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading || success}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--info)", color: "#fff" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Guardar nueva contraseña
            </button>
          </div>
        </div>
      )}
    </>
  );
}
