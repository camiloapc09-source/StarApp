"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, X, Loader2, Check, Copy, MessageCircleMore } from "lucide-react";

export default function BulkResetParentsButton({
  pendingCount,
  clubName = "el club",
}: {
  pendingCount: number;
  clubName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ reset: number; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tempPassword = done?.tempPassword ?? "123456789";

  const broadcastMsg =
    `¡Hola familias! 👋 Les compartimos cómo entrar a la app de *${clubName}* 📲\n\n` +
    `👤 *Usuario:* el número de documento de su hijo(a)\n` +
    `🔑 *Contraseña:* ${tempPassword}\n\n` +
    `Una vez adentro, por favor:\n` +
    `1️⃣ Cambien la contraseña por una personal 🔒\n` +
    `2️⃣ Si tienen más de un hijo en el club, vincúlenlos desde *Configurar cuenta* 👨‍👩‍👧‍👦\n\n` +
    `Cualquier duda nos escriben. ¡Gracias! 💚`;

  async function reset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/parents/bulk-reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al resetear");
      setDone({ reset: data.reset, tempPassword: data.tempPassword });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function copyMsg() {
    navigator.clipboard.writeText(broadcastMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setDone(null); setError(null); }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(139,92,246,0.12)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.30)" }}
      >
        <KeyRound size={14} />
        Resetear {pendingCount} sin configurar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

            <div className="px-5 py-4 flex items-center justify-between border-b"
              style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center gap-2">
                <KeyRound size={16} style={{ color: "#C4B5FD" }} />
                <span className="font-semibold text-sm">Reseteo masivo de acudientes</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {!done ? (
              <div className="p-5 space-y-4">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Esto pondrá la clave temporal <strong style={{ color: "#C4B5FD" }}>{tempPassword}</strong> a los{" "}
                  <strong>{pendingCount}</strong> acudiente{pendingCount !== 1 ? "s" : ""} que <strong>aún no han configurado</strong> su cuenta.
                </p>
                <ul className="text-xs space-y-1.5 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
                  <li>• Los que <strong style={{ color: "rgba(255,255,255,0.7)" }}>ya configuraron</strong> su cuenta NO se tocan.</li>
                  <li>• Entrarán con el <strong style={{ color: "rgba(255,255,255,0.7)" }}>documento de su hijo</strong> y la clave {tempPassword}.</li>
                  <li>• Al entrar podrán vincular sus otros hijos y elegir su clave real.</li>
                </ul>
                {error && (
                  <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)" }}>
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <button onClick={reset} disabled={loading || pendingCount === 0}
                    className="flex-[2] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "rgba(139,92,246,0.18)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.35)" }}>
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" /> Reseteando…</>
                      : <><KeyRound size={14} /> Resetear {pendingCount} acudientes</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#34D399" }}>
                  <Check size={16} /> {done.reset} acudiente{done.reset !== 1 ? "s" : ""} reseteado{done.reset !== 1 ? "s" : ""}.
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Copia este mensaje y pégalo en el grupo de WhatsApp del club:
                </p>
                <pre className="text-xs whitespace-pre-wrap rounded-xl p-3 leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.80)", fontFamily: "inherit" }}>
{broadcastMsg}
                </pre>
                <div className="flex gap-2">
                  <button onClick={copyMsg}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
                    {copied ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar mensaje</>}
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(broadcastMsg)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
                    <MessageCircleMore size={14} /> Abrir WhatsApp
                  </a>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-full py-2 rounded-xl text-sm font-medium border hover:opacity-70"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
