import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";

// POST   /api/payments/[id]/promise  Body: { date: "YYYY-MM-DD", note?: string }
//        Registra que el acudiente prometió pagar ese día.
// DELETE /api/payments/[id]/promise  Quita la promesa.
//
// Solo guarda la promesa. El recordatorio lo manda el cron del día prometido.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return apiError("Fecha inválida", 400);
  }
  const promisedDate = parseDateOnly(body.date);
  if (Number.isNaN(promisedDate.getTime())) return apiError("Fecha inválida", 400);

  const payment = await db.payment.findUnique({
    where: { id },
    select: { clubId: true, status: true },
  });
  if (!payment || payment.clubId !== clubId) return apiError("Not found", 404);
  if (payment.status === "COMPLETED") return apiError("Este cobro ya está pagado", 400);

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  await db.payment.update({
    where: { id },
    // Al cambiar la fecha se reinicia el aviso: la nueva promesa se recuerda de nuevo.
    data: { promisedDate, promiseNote: note, promiseRemindedAt: null },
  });
  return apiOk({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id }, select: { clubId: true } });
  if (!payment || payment.clubId !== clubId) return apiError("Not found", 404);

  await db.payment.update({
    where: { id },
    data: { promisedDate: null, promiseNote: null, promiseRemindedAt: null },
  });
  return apiOk({ ok: true });
}
