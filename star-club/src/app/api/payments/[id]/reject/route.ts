import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/payments/[id]/reject  admin rejects proof, resets to PENDING
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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

  return NextResponse.json(payment);
}
