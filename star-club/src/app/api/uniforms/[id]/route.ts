import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"]),
});

// PATCH /api/uniforms/[id] — admin updates order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const order = await db.uniformOrder.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { parent: { include: { user: { select: { id: true, name: true } } } } },
  });

  const statusLabels: Record<string, string> = {
    CONFIRMED:  "confirmado ✅",
    DELIVERED:  "entregado 📦",
    CANCELLED:  "cancelado ❌",
  };

  if (parsed.data.status !== "PENDING" && statusLabels[parsed.data.status]) {
    await db.notification.create({
      data: {
        userId:  order.parent.user.id,
        title:   "Pedido de uniforme actualizado",
        message: `Tu pedido de uniforme fue ${statusLabels[parsed.data.status]}.`,
        type:    "INFO",
      },
    });
  }

  return NextResponse.json(order);
}
