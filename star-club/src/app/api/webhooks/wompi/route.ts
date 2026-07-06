import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api";
import { verifyEventChecksum, mapWompiMethod } from "@/lib/wompi";
import { sendPushToUser } from "@/lib/push";

/**
 * POST /api/webhooks/wompi
 * Recibe los eventos de Wompi. Valida el checksum y, cuando una transacción
 * queda APROBADA, marca el pago correspondiente como COMPLETED.
 * Ruta pública (sin sesión) — la autenticidad se valida con WOMPI_EVENTS_SECRET.
 */
export async function POST(req: NextRequest) {
  let event: {
    event?: string;
    data?: { transaction?: Record<string, unknown> };
    signature?: { properties?: string[]; checksum?: string };
    timestamp?: number;
  };
  try {
    event = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  if (!verifyEventChecksum(event)) return apiError("Invalid signature", 401);

  const tx = event.data?.transaction as
    | { status?: string; reference?: string; amount_in_cents?: number; payment_method_type?: string; id?: string }
    | undefined;

  if (!tx?.reference) return apiOk({ ok: true, ignored: "no reference" });

  // Solo nos interesa una transacción aprobada
  if (tx.status !== "APPROVED") {
    return apiOk({ ok: true, status: tx.status });
  }

  const payment = await db.payment.findUnique({ where: { wompiReference: tx.reference } });
  if (!payment) return apiOk({ ok: true, ignored: "payment not found" });

  // Idempotencia: si ya está pagado, no hacer nada
  if (payment.status === "COMPLETED") return apiOk({ ok: true, alreadyPaid: true });

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      paidAt: new Date(),
      paymentMethod: mapWompiMethod(tx.payment_method_type),
    },
  });

  // Notificar al jugador y a sus acudientes
  const player = await db.player.findUnique({
    where: { id: payment.playerId },
    select: { userId: true, parentLinks: { select: { parent: { select: { userId: true } } } } },
  });
  if (player) {
    const userIds = [player.userId, ...player.parentLinks.map((l) => l.parent.userId)].filter(Boolean) as string[];
    for (const userId of userIds) {
      await db.notification.create({
        data: {
          userId,
          title: "Pago confirmado ✅",
          message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" fue procesado con éxito.`,
          type: "PAYMENT",
          link: "/dashboard/parent/payments",
        },
      });
      await sendPushToUser(userId, {
        title: "Pago confirmado ✅",
        body: `$${payment.amount.toLocaleString("es-CO")} · ${payment.concept}`,
        url: "/dashboard/parent/payments",
      }).catch(() => { /* push best-effort */ });
    }
  }

  return apiOk({ ok: true, paymentId: payment.id });
}
