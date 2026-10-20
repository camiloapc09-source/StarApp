"use client";

/**
 * Avisos (toasts) y ventanas de confirmación propias de la app.
 *
 * Reemplazan `alert()` y `confirm()` del navegador, que salían como cuadros
 * grises del sistema y rompían el diseño. Se usan igual de fácil, desde
 * cualquier parte (no son hooks):
 *
 *   toast.success("Pago registrado");
 *   toast.error(data.error ?? "No se pudo guardar");
 *   if (!(await confirmDialog("¿Eliminar esta misión?"))) return;
 *
 * `<FeedbackHost />` va una sola vez en el layout raíz.
 */

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; type: ToastType; message: string };

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón rojo. Si no se indica, se deduce del texto (eliminar, borrar…). */
  danger?: boolean;
};
type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

type FeedbackStore = {
  toasts: ToastItem[];
  confirm: ConfirmState | null;
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
  setConfirm: (c: ConfirmState | null) => void;
};

let nextId = 1;

const useFeedback = create<FeedbackStore>((set) => ({
  toasts: [],
  confirm: null,
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.type === "error" ? 6000 : 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  setConfirm: (confirm) => set({ confirm }),
}));

function show(type: ToastType, message: string) {
  useFeedback.getState().push({ type, message });
}

export const toast = Object.assign((message: string) => show("info", message), {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
});

const DANGER_WORDS = /eliminar|borrar|rechazar|liberar|desactivar|no se puede deshacer/i;

export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  const opts: ConfirmOptions = typeof input === "string" ? { message: input } : input;
  const store = useFeedback.getState();
  // Si había otra confirmación abierta, se cancela.
  store.confirm?.resolve(false);
  return new Promise((resolve) => {
    store.setConfirm({ ...opts, danger: opts.danger ?? DANGER_WORDS.test(opts.message), resolve });
  });
}

const TOAST_STYLE: Record<ToastType, { color: string; Icon: typeof Info }> = {
  success: { color: "var(--success)", Icon: CheckCircle2 },
  error:   { color: "var(--error)",   Icon: AlertTriangle },
  info:    { color: "var(--accent)",  Icon: Info },
};

export function FeedbackHost() {
  const { toasts, dismiss, confirm, setConfirm } = useFeedback();
  const confirmBtn = useRef<HTMLButtonElement>(null);

  function close(ok: boolean) {
    confirm?.resolve(ok);
    setConfirm(null);
  }

  useEffect(() => {
    if (!confirm) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  return (
    <>
      {/* Avisos: arriba en celular (no tapan la barra inferior), abajo a la derecha en escritorio */}
      <div
        className="fixed z-[100] left-4 right-4 top-4 md:left-auto md:top-auto md:bottom-6 md:right-6 md:w-96 flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { color, Icon } = TOAST_STYLE[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl backdrop-blur-xl"
                style={{
                  background: "color-mix(in srgb, var(--bg-elevated) 96%, transparent)",
                  border: "1px solid var(--border-primary)",
                  borderLeft: `3px solid ${color}`,
                  boxShadow: "var(--shadow-elevated)",
                }}
              >
                <Icon size={18} className="flex-shrink-0 mt-0.5" style={{ color }} />
                <p className="flex-1 leading-snug" style={{ color: "var(--text-primary)" }}>{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Cerrar aviso"
                  className="flex-shrink-0 p-0.5 rounded-md opacity-60 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirmación */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.70)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-elevated)" }}
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: confirm.danger ? "rgba(255,71,87,0.12)" : "var(--accent-glow)" }}
                >
                  {confirm.danger
                    ? <AlertTriangle size={20} style={{ color: "var(--error)" }} />
                    : <Info size={20} style={{ color: "var(--accent)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="confirm-title" className="font-bold text-base">
                    {confirm.title ?? (confirm.danger ? "¿Estás seguro?" : "Confirmar")}
                  </h2>
                  <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                    {confirm.message}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
                >
                  {confirm.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  ref={confirmBtn}
                  type="button"
                  onClick={() => close(true)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity hover:opacity-90"
                  style={{
                    background: confirm.danger ? "var(--error)" : "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {confirm.confirmLabel ?? (confirm.danger ? "Sí, continuar" : "Aceptar")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
