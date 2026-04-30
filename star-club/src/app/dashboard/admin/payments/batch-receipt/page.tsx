import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReceiptShareButton from "./receipt-share-button";

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
      <div className="space-y-6 max-w-sm mx-auto">
        {payments.map((payment) => {
          const receiptNo = payment.id.slice(-8).toUpperCase();
          const parentPhone = payment.player.parentLinks?.[0]?.parent?.phone ?? null;
          const methodLabel = payment.paymentMethod
            ? (METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod)
            : "—";
          const dateLabel = payment.paidAt
            ? format(new Date(payment.paidAt), "d 'de' MMMM yyyy", { locale: es })
            : "—";

          return (
            <ReceiptShareButton
              key={payment.id}
              paymentId={payment.id}
              playerName={payment.player.user.name}
              amount={payment.amount}
              concept={payment.concept}
              methodLabel={methodLabel}
              dateLabel={dateLabel}
              receiptNo={receiptNo}
              clubName={club?.name ?? "Club"}
              parentPhone={parentPhone}
            />
          );
        })}
      </div>
    </div>
  );
}
