import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

// POST /api/payments/[id]/reject - admin rejects proof, resets to PENDING
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const existing = await db.payment.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const payment = await db.payment.update({
    where: { id },
    data: { status: "PENDING", proofUrl: null, proofNote: null, paymentMethod: null },
    include: { player: { select: { userId: true } } },
  });

  await db.notification.create({
    data: {
      userId: payment.player.userId,
      title: "Comprobante no aceptado",
      message: `El comprobante de pago para "${payment.concept}" fue rechazado. Por favor contáctate con el administrador.`,
      type: "ALERT",
      link: "/dashboard/parent",
    },
  });

  return apiOk(payment);
}
