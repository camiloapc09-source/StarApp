import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ShareReceiptButton from "./print-button";

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia bancaria",
  NEQUI:    "Nequi",
  CASH:     "Efectivo",
  CARD:     "Tarjeta",
  PSE:      "PSE",
};

export default async function PaymentReceiptPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          player: {
            include: {
              user: { select: { name: true } },
              category: { select: { name: true } },
              payments: {
                where: { id: params.id, status: "COMPLETED" },
                take: 1,
                include: {
                  player: { include: { user: { select: { name: true } }, category: { select: { name: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const payment = parent?.children[0]?.player?.payments?.[0];

  if (!payment) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Comprobante no encontrado.</p>
        <Link href="/dashboard/parent/payments" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
          Volver a pagos
        </Link>
      </div>
    );
  }

  const player   = parent!.children[0].player;
  const receiptNo = payment.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-primary)" }}>
      {/* Nav (hidden on print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/dashboard/parent/payments"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} /> Volver
        </Link>
        <ShareReceiptButton receiptNo={receiptNo} />
      </div>

      {/* Receipt card */}
      <div
        id="receipt"
        className="max-w-md mx-auto rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
      >
        {/* Header strip */}
        <div className="px-6 py-5 text-center" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(49,46,129,0.18) 100%)", borderBottom: "1px solid var(--border-primary)" }}>
          <CheckCircle2 size={36} className="mx-auto mb-2" style={{ color: "#34D399" }} />
          <h1 className="text-xl font-black text-white">Pago confirmado</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Comprobante #{receiptNo}</p>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">

          {/* Amount */}
          <div className="text-center py-3 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(52,211,153,0.6)" }}>
              Valor pagado
            </p>
            <p className="text-4xl font-black" style={{ color: "#34D399" }}>
              ${payment.amount.toLocaleString("es-CO")}
            </p>
          </div>

          {/* Info rows */}
          {[
            { label: "Concepto",          value: payment.concept },
            { label: "Jugador",           value: player.user.name },
            { label: "Categoría",         value: player.category?.name ?? "—" },
            { label: "Método de pago",    value: payment.paymentMethod ? (METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod) : "—" },
            { label: "Fecha de pago",     value: payment.paidAt ? format(new Date(payment.paidAt), "EEEE d 'de' MMMM yyyy", { locale: es }) : "—" },
            { label: "Fecha de emisión",  value: format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
              <span className="text-sm font-semibold text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center border-t" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Este comprobante acredita el pago registrado en el sistema del club.
          </p>
          <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>
            ID: {payment.id}
          </p>
        </div>
      </div>
    </div>
  );
}
