
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";
import { repairShiftedPaymentDays } from "@/lib/payment-reminders";

/**
 * Reparación del día de pago corrido por zona horaria.
 *
 * `new Date("2026-09-22")` se leía como medianoche UTC, que en Colombia es el
 * 21 a las 7 p.m. Al activar un deportista el día 22 le quedaba día de pago 21,
 * y desde entonces todas sus mensualidades vencen un día antes.
 *
 *   GET  → solo reporta qué cambiaría. No escribe nada.
 *   POST → aplica los cambios.
 *
 * Se corrige únicamente el desfase de exactamente un día; un día de pago que el
 * admin puso a propósito no se toca.
 */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const fixes = await repairShiftedPaymentDays(clubId, false);
  return apiOk({
    applied: false,
    count: fixes.length,
    changes: fixes,
    message: fixes.length === 0
      ? "No hay días de pago corridos."
      : `${fixes.length} deportista(s) con el día de pago corrido. Envía POST para aplicar.`,
  });
}

export async function POST() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const fixes = await repairShiftedPaymentDays(clubId, true);
  return apiOk({
    applied: true,
    count: fixes.length,
    changes: fixes,
    message: `${fixes.length} día(s) de pago corregido(s).`,
  });
}
