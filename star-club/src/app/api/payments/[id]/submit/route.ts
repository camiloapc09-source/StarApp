import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "NEQUI", "PSE", "CARD"]),
  proofNote: z.string().max(500).optional(),
});

// POST /api/payments/[id]/submit - parent or player reports a payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["PARENT", "PLAYER"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment || payment.clubId !== clubId) return apiError("Payment not found", 404);

  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { playerId: true } } },
    });
    if (!parent) return apiError("Parent profile not found", 404);
    if (!parent.children.map((c) => c.playerId).includes(payment.playerId)) return apiError("Forbidden", 403);
  } else {
    const player = await db.player.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!player || player.id !== payment.playerId) return apiError("Forbidden", 403);
  }

  if (payment.status === "COMPLETED") return apiError("Payment already completed", 400);

  // Apply early-payment discount if the submission falls within the club's early window
  // Window: [dueDate, dueDate + earlyPaymentDays)
  let discountedAmount: number | undefined;
  try {
    const club = await db.club.findUnique({
      where: { id: payment.clubId },
      select: { earlyPaymentDiscount: true, earlyPaymentDays: true },
    });
    if (club && club.earlyPaymentDiscount > 0 && club.earlyPaymentDays > 0) {
      const now = new Date();
      const windowStart = new Date(payment.dueDate);
      const windowEnd = new Date(payment.dueDate);
      windowEnd.setDate(windowEnd.getDate() + club.earlyPaymentDays);
      if (now >= windowStart && now < windowEnd) {
        discountedAmount = Math.max(0, payment.amount - club.earlyPaymentDiscount);
      }
    }
  } catch { /* non-fatal: proceed with original amount */ }

  const updated = await db.payment.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      paymentMethod: parsed.data.paymentMethod,
      proofNote: parsed.data.proofNote ?? null,
      ...(discountedAmount !== undefined ? { amount: discountedAmount } : {}),
    },
  });

  try {
    const admins = await db.user.findMany({ where: { clubId, role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      const playerUser = await db.player.findUnique({
        where: { id: payment.playerId },
        include: { user: { select: { name: true } } },
      });
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Pago reportado para verificar",
          message: `${playerUser?.user.name ?? "Un deportista"} reportó un pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}".`,
          type: "PAYMENT",
          link: "/dashboard/admin/payments",
        })),
      });
    }
  } catch { /* non-fatal */ }

  return apiOk(updated);
}
