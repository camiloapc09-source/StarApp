import { NextRequest } from "next/server";
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";
import { runPaymentReminders } from "@/lib/payment-reminders";

/**
 * POST /api/payments/mark-overdue
 *
 * Dispara a mano el mismo ciclo que corre el cron diario: marca vencidos,
 * avisa a quien corresponda y manda correo al acudiente.
 *
 * Toda la lógica vive ahora en `runPaymentReminders`. Antes estaba duplicada
 * aquí y en el render de `/dashboard/admin/payments`, con comportamientos
 * distintos: la página no enviaba push ni correo, y hacía una consulta por
 * cada pago y cada usuario.
 */
export async function POST(_req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const result = await runPaymentReminders(clubId, { notify: true });

  const nothingHappened =
    result.markedOverdue === 0 && result.overdueNotified === 0 && result.dueSoonNotified === 0;

  return apiOk({
    updated: result.markedOverdue,
    notified: result.overdueNotified + result.dueSoonNotified,
    emailsSent: result.emailsSent,
    message: nothingHappened
      ? "Todo al día — no hay cobros vencidos ni próximos a vencer."
      : `${result.markedOverdue} cobro(s) marcados como vencidos · ${result.overdueNotified + result.dueSoonNotified} aviso(s) enviados.`,
  });
}
