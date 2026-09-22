import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { ensureNextMonthlyPayment } from "@/lib/billing";
import { evaluateDiscount } from "@/lib/discount";

const schema = z.object({
  ids:           z.array(z.string()).min(1).max(100),
  paymentMethod: z.enum(["CASH", "TRANSFER", "NEQUI", "CARD", "PSE"]).default("CASH"),
  /** Aplicar el descuento por pronto pago a los cobros que califiquen. */
  applyDiscount: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { ids, paymentMethod, applyDiscount } = parsed.data;

  // Verify all payments belong to this club and are not already completed
  const payments = await db.payment.findMany({
    where: { id: { in: ids }, clubId, status: { in: ["PENDING", "OVERDUE", "SUBMITTED"] } },
    include: { player: { select: { id: true, userId: true, paymentDay: true, monthlyAmount: true } } },
  });

  if (payments.length === 0) return apiError("No se encontraron pagos válidos", 400);

  const paidAt = new Date();

  // El descuento por pronto pago también vale aquí. Sin esto, cobrar en masa
  // le quitaba el beneficio a las familias que sí pagaron a tiempo, según si
  // el admin usó el botón individual o el masivo.
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { earlyPaymentDays: true, earlyPaymentDiscount: true },
  });
  const discountConfig = applyDiscount ? (club ?? {}) : {};

  const results = payments.map((p) => {
    const evaluated = evaluateDiscount(p.dueDate, p.amount, discountConfig, paidAt);
    const discount = evaluated.applies ? evaluated.amount : 0;
    return { payment: p, discount, finalAmount: p.amount - discount };
  });

  // Cada cobro puede quedar con un monto distinto, así que se actualizan uno a
  // uno. Los que no tienen descuento van juntos en un solo `updateMany`.
  const withDiscount = results.filter((r) => r.discount > 0);
  const plain = results.filter((r) => r.discount === 0);

  if (plain.length > 0) {
    await db.payment.updateMany({
      where: { id: { in: plain.map((r) => r.payment.id) } },
      data: { status: "COMPLETED", paidAt, paymentMethod },
    });
  }
  for (const r of withDiscount) {
    await db.payment.update({
      where: { id: r.payment.id },
      data: {
        status: "COMPLETED", paidAt, paymentMethod,
        amount: r.finalAmount,
        originalAmount: r.payment.amount,
        discountAmount: r.discount,
        proofNote: `Descuento por pronto pago: $${r.discount.toLocaleString("es-CO")} sobre $${r.payment.amount.toLocaleString("es-CO")}`,
      },
    });
  }

  // Send notifications (non-blocking)
  const notifData = results.map((r) => ({
    userId: r.payment.player.userId,
    title: "Pago confirmado ✓",
    message: r.discount > 0
      ? `Tu pago de $${r.finalAmount.toLocaleString("es-CO")} por "${r.payment.concept}" fue registrado, con $${r.discount.toLocaleString("es-CO")} de descuento por pronto pago. 🎉`
      : `Tu pago de $${r.payment.amount.toLocaleString("es-CO")} por "${r.payment.concept}" fue registrado.`,
    type: "PAYMENT",
  }));
  await db.notification.createMany({ data: notifData });

  // Auto-generar el cobro del siguiente mes por jugador (una sola vez por jugador,
  // cuando queda al día). Usa el monto pagado como respaldo si no hay monthlyAmount.
  // `p.amount` es el monto ORIGINAL (se leyó antes de aplicar el descuento),
  // que es justo lo que debe heredar el cobro del mes siguiente. Usar el monto
  // ya descontado volvería permanente una rebaja puntual.
  const amountByPlayer = new Map<string, number>();
  for (const p of payments) {
    const prev = amountByPlayer.get(p.player.id) ?? 0;
    if (p.amount > prev) amountByPlayer.set(p.player.id, p.amount);
  }
  for (const [playerId, amount] of amountByPlayer) {
    try {
      await ensureNextMonthlyPayment(playerId, amount);
    } catch (e) {
      console.error("Failed to auto-generate next payment (bulk)", e);
    }
  }

  const totalDiscount = results.reduce((s, r) => s + r.discount, 0);
  return apiOk({
    confirmed: payments.length,
    ids: payments.map((p) => p.id),
    discountApplied: totalDiscount,
    discountedCount: withDiscount.length,
  });
}
