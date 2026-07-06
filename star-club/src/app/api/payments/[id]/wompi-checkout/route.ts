import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isResponse, apiError } from "@/lib/api";
import { wompiConfigured, toCents, buildCheckoutUrl, makeReference } from "@/lib/wompi";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://starapp-9qb7.onrender.com";

/**
 * GET /api/payments/[id]/wompi-checkout
 * Genera la referencia + firma de integridad y redirige al Web Checkout de Wompi.
 * Autorizado para el acudiente del jugador, el propio jugador, o un admin.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const { id } = await params;

  if (!wompiConfigured()) return apiError("Pagos en línea no están disponibles.", 503);

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      player: {
        select: {
          id: true, userId: true, clubId: true,
          parentLinks: { select: { parent: { select: { userId: true, user: { select: { name: true, email: true } } } } } },
        },
      },
    },
  });
  if (!payment) return apiError("Pago no encontrado", 404);

  // Autorización: acudiente vinculado, el propio jugador, o admin del club
  const role = (session.user as { role?: string }).role;
  const uid = session.user.id;
  const isParent = payment.player.parentLinks.some((l) => l.parent.userId === uid);
  const isPlayer = payment.player.userId === uid;
  const isAdmin = role === "ADMIN" && (session.user as { clubId?: string }).clubId === payment.player.clubId;
  if (!isParent && !isPlayer && !isAdmin) return apiError("No autorizado", 403);

  if (payment.status === "COMPLETED") {
    return NextResponse.redirect(`${APP_URL}/dashboard/${(role ?? "parent").toLowerCase()}/payments`);
  }

  const reference = makeReference(payment.id);
  await db.payment.update({ where: { id: payment.id }, data: { wompiReference: reference } });

  const parentUser = payment.player.parentLinks[0]?.parent.user;
  const redirectPath =
    role === "PLAYER" ? "/dashboard/player/payments" :
    role === "ADMIN"  ? "/dashboard/admin/payments" :
    `/dashboard/parent/payments?playerId=${payment.player.id}`;

  const checkoutUrl = buildCheckoutUrl({
    reference,
    amountInCents: toCents(payment.amount),
    redirectUrl: `${APP_URL}${redirectPath}`,
    customerEmail: parentUser?.email,
    customerName: parentUser?.name,
  });

  return NextResponse.redirect(checkoutUrl);
}
