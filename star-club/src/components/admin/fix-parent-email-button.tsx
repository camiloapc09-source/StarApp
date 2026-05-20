"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Check, X } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  currentEmail: string;
}

export default function FixParentEmailButton({ userId, userName, currentEmail }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    if (!email.includes("@")) return alert("Ingresa un email válido");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert(data.error ?? "Error al actualizar");
      }
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--success)" }}>
        <Check size={12} /> Email actualizado
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#F87171",
        }}
      >
        <AlertTriangle size={11} />
        Email roto — corregir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="email"
        placeholder={`Email real de ${userName.split(" ")[0]}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(139,92,246,0.40)",
          color: "var(--text-primary)",
          minWidth: 200,
        }}
      />
      <button
        onClick={save}
        disabled={saving}
        className="p-1.5 rounded-lg transition-all disabled:opacity-50"
        style={{ background: "rgba(52,211,153,0.15)", color: "#34D399" }}
      >
        <Check size={13} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="p-1.5 rounded-lg transition-all"
        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
