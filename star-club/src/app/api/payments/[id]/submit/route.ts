import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "NEQUI", "PSE", "CARD"]),
  proofNote: z.string().max(500).optional(),
});

// POST /api/payments/[id]/submit  parent reports a payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "PLAYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Authorization: parent must have child linked, player must own the payment
  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { playerId: true } } },
    });
    if (!parent) return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
    const playerIds = parent.children.map((c) => c.playerId);
    if (!playerIds.includes(payment.playerId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // PLAYER: must own the payment directly
    const player = await db.player.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!player || player.id !== payment.playerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (payment.status === "COMPLETED") {
    return NextResponse.json({ error: "Payment already completed" }, { status: 400 });
  }

  const updated = await db.payment.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      paymentMethod: parsed.data.paymentMethod,
      proofNote: parsed.data.proofNote ?? null,
    },
  });

  // Notify all admins
  try {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      const playerUser = await db.player.findUnique({
        where: { id: payment.playerId },
        include: { user: { select: { name: true } } },
      });
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Pago reportado para verificar",
          message: `${playerUser?.user.name ?? "Un deportista"} reportó un pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" vía ${parsed.data.paymentMethod === "CASH" ? "efectivo" : "transferencia"}.`,
          type: "PAYMENT",
          link: "/dashboard/admin/payments",
        })),
      });
    }
  } catch {
    // Non-fatal
  }

  return NextResponse.json(updated);
}
