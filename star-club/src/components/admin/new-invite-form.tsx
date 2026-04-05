"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";

type Props = {
  defaultRole?: "PLAYER" | "COACH";
  hideRoleSelect?: boolean;
};

export default function NewInviteForm({ defaultRole = "PLAYER", hideRoleSelect = false }: Props) {
  const [role, setRole] = useState<string>(defaultRole);
  const [result, setResult] = useState<{ code: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Error al generar código");
        setResult(null);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!result?.code) return;
    navigator.clipboard?.writeText(result.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-4">
      {!hideRoleSelect && (
        <div className="flex gap-2">
          {(["PLAYER", "COACH"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setResult(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={role === r
                ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
            >
              {r === "PLAYER" ? "Deportista" : "Entrenador"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate}>
        <Button type="submit" disabled={loading} variant={result ? "secondary" : "primary"} size="sm">
          {loading ? (
            <><RefreshCw size={14} className="animate-spin" /> Generando...</>
          ) : result ? (
            <><RefreshCw size={14} /> Generar nuevo</>
          ) : (
            "Generar código"
          )}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {result && (
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--accent)", borderWidth: 1 }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
              Código de registro · {role === "PLAYER" ? "Deportista" : "Entrenador"}
            </p>
            <span className="font-mono text-2xl font-black tracking-wider" style={{ color: "var(--accent)" }}>
              {result.code}
            </span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
            style={copied
              ? { background: "rgba(0,255,135,0.15)", color: "var(--accent)", borderColor: "var(--accent)" }
              : { background: "var(--bg-hover)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
          >
            {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>
      )}
    </div>
  );
}

