import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { ensureNextMonthlyPayment } from "@/lib/billing";

// POST /api/payments/[id]/skip — el deportista no vino este mes: no se le cobra.
//
// Antes, para no cobrar un mes, el admin BORRABA el cobro. Pero el mes
// siguiente solo se genera al confirmar un pago, así que al borrar el único
// cobro abierto la cadena se cortaba y el alumno no volvía a tener cobros.
//
// Aquí el cobro queda en el historial como SKIPPED ("No vino"), no cuenta como
// deuda ni como recaudo, y sirve de referencia para generar el mes siguiente.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const existing = await db.payment.findUnique({
    where: { id },
    select: { clubId: true, playerId: true, amount: true, status: true },
  });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);
  if (!["PENDING", "OVERDUE", "SUBMITTED"].includes(existing.status)) {
    return apiError("Solo se puede marcar un cobro que esté por pagar.", 400);
  }

  const payment = await db.payment.update({
    where: { id },
    data: {
      status: "SKIPPED",
      paidAt: null,
      proofUrl: null,
      paymentMethod: null,
      proofNote: "No vino este mes — no se cobra",
    },
  });

  let nextPaymentId: string | null = null;
  try {
    nextPaymentId = await ensureNextMonthlyPayment(existing.playerId, existing.amount);
  } catch (e) {
    console.error("Failed to auto-generate next payment (skip)", e);
  }

  return apiOk({ ...payment, nextPaymentId });
}
