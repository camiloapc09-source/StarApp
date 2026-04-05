"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Banknote, X } from "lucide-react";

export function PaymentConfirmButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function confirm() {
    setLoading(true);
    await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(0,255,135,0.15)", color: "var(--success)", border: "1px solid rgba(0,255,135,0.3)" }}
    >
      <Check size={13} /> {loading ? "Confirmando..." : "Confirmar"}
    </button>
  );
}

export function PaymentCashButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function registerCash() {
    setLoading(true);
    await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={registerCash}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(255,184,0,0.12)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.3)" }}
    >
      <Banknote size={13} /> {loading ? "Registrando..." : "Efectivo recibido"}
    </button>
  );
}

export function PaymentRejectButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function reject() {
    if (!confirm("¿Rechazar este comprobante y devolver el pago a Pendiente?")) return;
    setLoading(true);
    await fetch(`/api/payments/${paymentId}/reject`, { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={reject}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)", border: "1px solid rgba(255,71,87,0.25)" }}
    >
      <X size={13} /> {loading ? "..." : "Rechazar"}
    </button>
  );
}
