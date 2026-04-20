import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  ids:           z.array(z.string()).min(1).max(100),
  paymentMethod: z.enum(["CASH", "TRANSFER", "NEQUI", "CARD", "PSE"]).default("CASH"),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { ids, paymentMethod } = parsed.data;

  // Verify all payments belong to this club and are not already completed
  const payments = await db.payment.findMany({
    where: { id: { in: ids }, clubId, status: { in: ["PENDING", "OVERDUE", "SUBMITTED"] } },
    include: { player: { select: { id: true, userId: true, paymentDay: true, monthlyAmount: true } } },
  });

  if (payments.length === 0) return apiError("No se encontraron pagos válidos", 400);

  const paidAt = new Date();

  await db.payment.updateMany({
    where: { id: { in: payments.map((p) => p.id) } },
    data: { status: "COMPLETED", paidAt, paymentMethod },
  });

  // Send notifications (non-blocking)
  const notifData = payments.map((p) => ({
    userId: p.player.userId,
    title: "Pago confirmado ✓",
    message: `Tu pago de $${p.amount.toLocaleString("es-CO")} por "${p.concept}" fue registrado.`,
    type: "PAYMENT",
  }));
  await db.notification.createMany({ data: notifData });

  return apiOk({ confirmed: payments.length, ids: payments.map((p) => p.id) });
}
