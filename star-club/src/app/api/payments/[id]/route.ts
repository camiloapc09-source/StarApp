import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { ensureNextMonthlyPayment } from "@/lib/billing";
import { parseDateOnly } from "@/lib/dates";
import { evaluateDiscount } from "@/lib/discount";

// PATCH /api/payments/[id] — admin confirms payment (full or partial)
// Body: { paymentMethod?: string, paidAmount?: number }
// If paidAmount < payment.amount → splits: closes current for paidAmount, creates PENDING for remainder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paymentMethod: string | null = body.paymentMethod ?? null;
  const paidAmount: number | null     = typeof body.paidAmount === "number" ? body.paidAmount : null;

  // Fecha en que realmente se recibió el dinero. Si no viene, es ahora.
  // No se aceptan fechas futuras.
  let paidAt = new Date();
  if (typeof body.paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidOn)) {
    const parsed = parseDateOnly(body.paidOn);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()) paidAt = parsed;
  }

  const existing = await db.payment.findUnique({
    where: { id },
    select: { clubId: true, amount: true, concept: true, dueDate: true, playerId: true },
  });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  // ── Descuento por pronto pago ──────────────────────────────────────────────
  // Se calcula SIEMPRE en el servidor a partir de la config del club: el
  // cliente solo pide aplicarlo, nunca dice cuánto. Es dinero.
  const clubConfig = await db.club.findUnique({
    where: { id: clubId },
    select: { name: true, earlyPaymentDays: true, earlyPaymentDiscount: true },
  });
  const wantsDiscount = body.applyDiscount === true;
  const discountEval = wantsDiscount
    ? evaluateDiscount(existing.dueDate, existing.amount, clubConfig ?? {}, paidAt)
    : null;
  const discountAmount = discountEval?.applies ? discountEval.amount : 0;

  // Con descuento, lo que el alumno DEBE pagar baja. Un pago por ese monto
  // salda el cobro; no es un abono parcial. Sin esta distinción se generaba un
  // "Saldo pendiente" fantasma por el valor del descuento.
  const expectedAmount = existing.amount - discountAmount;

  const isPartial = paidAmount !== null && paidAmount > 0 && paidAmount < expectedAmount;
  const effectiveAmount = isPartial ? paidAmount : expectedAmount;

  const payment = await db.payment.update({
    where: { id },
    data: {
      status:        "COMPLETED",
      paidAt,
      proofUrl:      null,
      amount:        effectiveAmount,
      // El monto original queda registrado explícitamente. Antes se
      // sobrescribía `amount` con lo abonado y el valor real del cobro se
      // perdía, dejando solo un texto suelto en la nota.
      originalAmount: isPartial || discountAmount > 0 ? existing.amount : null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      proofNote:     isPartial
        ? `Abono parcial de $${effectiveAmount.toLocaleString("es-CO")} sobre $${expectedAmount.toLocaleString("es-CO")}. Saldo pendiente: $${(expectedAmount - effectiveAmount).toLocaleString("es-CO")}`
        : discountAmount > 0
          ? `Descuento por pronto pago: $${discountAmount.toLocaleString("es-CO")} sobre $${existing.amount.toLocaleString("es-CO")}`
          : null,
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    include: {
      player: {
        select: {
          id: true, userId: true, paymentDay: true, monthlyAmount: true,
          payments: {
            where: { status: { in: ["PENDING", "OVERDUE", "SUBMITTED"] } },
            orderBy: { dueDate: "desc" },
            take: 1,
          },
          user: { select: { name: true } },
        },
      },
    },
  });

  // If partial: create a new PENDING for the remaining balance
  let balancePaymentId: string | null = null;
  if (isPartial) {
    // Sobre el monto CON descuento: si no, se le cobraría al acudiente un
    // saldo por un dinero que el club acaba de descontarle.
    const remaining = expectedAmount - effectiveAmount;
    const balance = await db.payment.create({
      data: {
        clubId,
        playerId: existing.playerId,
        amount:   remaining,
        concept:  `Saldo pendiente — ${existing.concept}`,
        status:   "PENDING",
        dueDate:  existing.dueDate,
      },
    });
    balancePaymentId = balance.id;
  }

  // Notify player
  const notifMsg = isPartial
    ? `Se registró un abono de $${effectiveAmount.toLocaleString("es-CO")} por "${existing.concept}". Saldo pendiente: $${(expectedAmount - effectiveAmount).toLocaleString("es-CO")}.`
    : discountAmount > 0
      // Que el acudiente vea el beneficio: es el punto de premiar el pronto pago.
      ? `Tu pago de $${effectiveAmount.toLocaleString("es-CO")} por "${payment.concept}" fue confirmado, con $${discountAmount.toLocaleString("es-CO")} de descuento por pronto pago. 🎉`
      : `Tu pago de $${effectiveAmount.toLocaleString("es-CO")} por "${payment.concept}" fue confirmado.`;

  await db.notification.create({
    data: {
      userId:  payment.player.userId,
      title:   isPartial ? "Abono registrado ✓" : "Pago confirmado ✓",
      message: notifMsg,
      type:    "PAYMENT",
    },
  });

  // El siguiente mes sí debe estar listo antes de responder: el admin vuelve a
  // una lista que tiene que reflejarlo.
  if (!isPartial) {
    try {
      // Se pasa el monto ORIGINAL, no lo que entró en caja. Con `effectiveAmount`
      // un descuento por pronto pago se habría copiado al cobro del mes
      // siguiente, volviéndose permanente y bajando la mensualidad sin querer.
      await ensureNextMonthlyPayment(existing.playerId, existing.amount);
    } catch (e) {
      console.error("Failed to auto-generate next payment", e);
    }
  }

  // Push y correo NO bloquean la respuesta. Antes se esperaba a Resend y al
  // servicio de push en serie, así que el botón "Registrar pago" se quedaba
  // girando un par de segundos por cada cobro.
  const notifyInBackground = (async () => {
    await sendPushToUser(payment.player.userId, {
      title: isPartial ? "Abono registrado ✓" : "Pago confirmado ✓",
      body: `$${effectiveAmount.toLocaleString("es-CO")} por "${payment.concept}"`,
      url: "/dashboard/parent/payments",
    });

    if (isPartial) return;

    const playerWithParent = await db.player.findUnique({
      where: { id: existing.playerId },
      select: {
        user: { select: { name: true } },
        parentLinks: {
          take: 1,
          include: { parent: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
    });
    const parentLink = playerWithParent?.parentLinks[0]?.parent;
    if (parentLink?.user?.email) {
      await sendPaymentConfirmedEmail({
        to: parentLink.user.email,
        parentName: parentLink.user.name,
        playerName: playerWithParent?.user.name ?? "",
        concept: payment.concept,
        amountCOP: effectiveAmount,
        clubName: clubConfig?.name ?? "el club",
        appUrl: process.env.NEXTAUTH_URL ?? "https://starapp-9qb7.onrender.com",
      });
    }
  })().catch((e) => console.error("Failed to notify payment confirmation", e));

  void notifyInBackground;

  return apiOk({ ...payment, balancePaymentId });
}

// DELETE /api/payments/[id] — admin deletes a payment record
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const existing = await db.payment.findUnique({
    where: { id },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  await db.payment.delete({ where: { id } });

  return apiOk({ deleted: true });
}
