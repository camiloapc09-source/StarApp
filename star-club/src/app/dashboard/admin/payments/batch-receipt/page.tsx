import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";

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
          parentLinks: {
            include: { parent: { select: { phone: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  if (payments.length === 0) redirect("/dashboard/admin/payments");

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-primary)" }}>
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/admin/payments"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} /> Volver a Pagos
        </Link>
        <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          {payments.length} comprobante{payments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Receipts */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {payments.map((payment) => {
          const receiptNo = payment.id.slice(-8).toUpperCase();
          const parentPhone = payment.player.parentLinks?.[0]?.parent?.phone;
          const phone = parentPhone || payment.player.phone;
          const digits = phone?.replace(/[^0-9]/g, "");
          const methodLabel = payment.paymentMethod
            ? (METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod)
            : "—";
          const dateLabel = payment.paidAt
            ? format(new Date(payment.paidAt), "d 'de' MMMM yyyy", { locale: es })
            : "—";

          const waText =
            `✅ *Pago confirmado — ${club?.name ?? "Club"}*\n\n` +
            `👤 ${payment.player.user.name}\n` +
            `📋 ${payment.concept}\n` +
            `💵 $${payment.amount.toLocaleString("es-CO")}\n` +
            `💳 ${methodLabel}\n` +
            `📅 ${dateLabel}\n` +
            `🔖 Ref: ${receiptNo}\n\n` +
            `¡Gracias por su pago! 🙌`;

          const waHref = digits
            ? `https://api.whatsapp.com/send?phone=57${digits.replace(/^57/, "")}&text=${encodeURIComponent(waText)}`
            : null;

          return (
            <div
              key={payment.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center gap-3"
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
              <div className="px-5 py-4 space-y-2">
                {[
                  { label: "Concepto",      value: payment.concept },
                  { label: "Categoría",     value: payment.player.category?.name ?? "—" },
                  { label: "Método",        value: methodLabel },
                  { label: "Fecha de pago", value: dateLabel },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-xs font-semibold text-right truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <div
                className="px-5 pb-4 pt-1"
                style={{ borderTop: "1px solid var(--border-primary)" }}
              >
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.30)" }}
                  >
                    <MessageCircle size={15} />
                    Enviar comprobante por WhatsApp
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    Sin teléfono registrado — no se puede enviar por WhatsApp
                  </p>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-2 text-center border-t"
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
    </div>
  );
}
