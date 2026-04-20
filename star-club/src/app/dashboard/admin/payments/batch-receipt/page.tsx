import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import PrintButton from "../../../parent/payments/[id]/receipt/print-button";

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia bancaria",
  NEQUI:    "Nequi",
  CASH:     "Efectivo",
  CARD:     "Tarjeta",
  PSE:      "PSE",
};

export default async function BatchReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").filter(Boolean);
  if (ids.length === 0) redirect("/dashboard/admin/payments");

  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true, logo: true } });

  const payments = await db.payment.findMany({
    where: { id: { in: ids }, clubId, status: "COMPLETED" },
    include: {
      player: {
        include: {
          user: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  if (payments.length === 0) redirect("/dashboard/admin/payments");

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-primary)" }}>
      {/* Nav — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/dashboard/admin/payments"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} /> Volver a Pagos
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            {payments.length} comprobante{payments.length !== 1 ? "s" : ""}
          </span>
          <PrintButton />
        </div>
      </div>

      {/* Print header — only shown when printing */}
      <div className="hidden print:block mb-6 text-center border-b pb-4" style={{ borderColor: "#e5e7eb" }}>
        {club?.logo && (
          <img src={club.logo} alt={club?.name} className="h-10 mx-auto mb-2 object-contain" />
        )}
        <h1 className="text-lg font-black">{club?.name ?? "Club"}</h1>
        <p className="text-sm text-gray-500">
          Comprobantes de pago — {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
        </p>
        <p className="text-sm font-bold mt-1">
          Total recaudado: ${total.toLocaleString("es-CO")} — {payments.length} pago{payments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Receipts grid — 2 per row on print */}
      <div className="space-y-4 print:space-y-0 max-w-2xl mx-auto print:max-w-none print:grid print:grid-cols-2 print:gap-4">
        {payments.map((payment) => {
          const receiptNo = payment.id.slice(-8).toUpperCase();
          return (
            <div
              key={payment.id}
              className="rounded-2xl overflow-hidden print:rounded-lg print:border print:border-gray-200"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center gap-3 print:py-3"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.20) 0%, rgba(49,46,129,0.12) 100%)",
                  borderBottom: "1px solid var(--border-primary)",
                }}
              >
                <CheckCircle2 size={22} style={{ color: "#34D399" }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[15px] truncate">{payment.player.user.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Comprobante #{receiptNo}
                  </p>
                </div>
                <p className="text-xl font-black flex-shrink-0" style={{ color: "#34D399" }}>
                  ${payment.amount.toLocaleString("es-CO")}
                </p>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-2 print:py-3">
                {[
                  { label: "Concepto",      value: payment.concept },
                  { label: "Categoría",     value: payment.player.category?.name ?? "—" },
                  { label: "Método",        value: payment.paymentMethod ? (METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod) : "—" },
                  { label: "Fecha de pago", value: payment.paidAt ? format(new Date(payment.paidAt), "d 'de' MMMM yyyy", { locale: es }) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-xs font-semibold text-right truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-2 text-center border-t print:py-2"
                style={{ borderColor: "var(--border-primary)" }}
              >
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  {club?.name} · ID: {payment.id}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer — print only */}
      <div className="hidden print:block mt-6 pt-4 border-t text-center" style={{ borderColor: "#e5e7eb" }}>
        <p className="text-sm font-bold text-gray-700">
          Total: ${total.toLocaleString("es-CO")} · {payments.length} pago{payments.length !== 1 ? "s" : ""} confirmados
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Generado el {format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
        </p>
      </div>
    </div>
  );
}
