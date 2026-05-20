"use client";

import { useState } from "react";
import { GitMerge, Loader2, X, Check, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ParentOption {
  userId: string;
  name: string;
  email: string;
  setupCompleted: boolean;
  children: { name: string; documentNumber: string | null; category: string | null }[];
}

interface Props {
  options: [ParentOption, ParentOption];
}

export default function MergeParentsButton({ options }: Props) {
  const [open, setOpen]       = useState(false);
  const [keepIdx, setKeepIdx] = useState<0 | 1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const router = useRouter();

  // Suggest keeping: setupCompleted > real email > first created
  const suggested: 0 | 1 = (() => {
    if (options[0].setupCompleted && !options[1].setupCompleted) return 0;
    if (options[1].setupCompleted && !options[0].setupCompleted) return 1;
    const r0 = !options[0].email.endsWith(".internal");
    const r1 = !options[1].email.endsWith(".internal");
    if (r0 && !r1) return 0;
    if (r1 && !r0) return 1;
    return 0;
  })();

  async function merge() {
    if (keepIdx === null) return;
    const deleteIdx = keepIdx === 0 ? 1 : 0;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/parents/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepUserId:   options[keepIdx].userId,
          deleteUserId: options[deleteIdx].userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al fusionar");
      setDone(true);
      setTimeout(() => { router.refresh(); setOpen(false); setDone(false); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setKeepIdx(suggested); setError(null); setDone(false); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.25)" }}
      >
        <GitMerge size={13} />
        Fusionar cuentas duplicadas
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  <GitMerge size={16} style={{ color: "#A78BFA" }} />
                  Fusionar cuentas duplicadas
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {options[0].name.trim()} tiene 2 cuentas. Elige cuál conservar — los hijos de ambas quedarán vinculados a esa.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {/* Account cards */}
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const isSelected = keepIdx === idx;
                const isSuggested = suggested === idx;
                return (
                  <button
                    key={opt.userId}
                    type="button"
                    onClick={() => setKeepIdx(idx as 0 | 1)}
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={{
                      background: isSelected ? "rgba(139,92,246,0.12)" : "var(--bg-elevated)",
                      border: `1.5px solid ${isSelected ? "rgba(139,92,246,0.45)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: isSelected ? "#A78BFA" : "rgba(255,255,255,0.25)", background: isSelected ? "#7C3AED" : "transparent" }}>
                          {isSelected && <Check size={9} color="white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-semibold">Cuenta {idx + 1}</span>
                        {isSuggested && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(52,211,153,0.15)", color: "#34D399" }}>
                            Recomendada
                          </span>
                        )}
                        {opt.setupCompleted && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(52,211,153,0.10)", color: "#34D399" }}>
                            Configurada
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs ml-6" style={{ color: "var(--text-muted)" }}>{opt.email}</p>
                    <div className="ml-6 mt-2 space-y-1">
                      {opt.children.map((c) => (
                        <div key={c.name} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                          <ChevronRight size={10} />
                          {c.name}
                          {c.documentNumber && <span style={{ color: "rgba(255,255,255,0.30)" }}>· {c.documentNumber}</span>}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {keepIdx !== null && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(139,92,246,0.08)", color: "rgba(196,181,253,0.70)" }}>
                Se conservará la Cuenta {keepIdx + 1} con todos los hijos vinculados. La otra cuenta será eliminada.
              </p>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button
                onClick={merge}
                disabled={keepIdx === null || loading || done}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: done ? "rgba(52,211,153,0.20)" : "rgba(139,92,246,0.25)", color: done ? "#34D399" : "#C4B5FD" }}
              >
                {done ? <><Check size={14} /> Fusionado</> :
                 loading ? <><Loader2 size={14} className="animate-spin" /> Fusionando…</> :
                 <><GitMerge size={14} /> Fusionar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
