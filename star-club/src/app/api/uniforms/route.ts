import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const PRICES: Record<string, number> = {
  TRAINING:     75000,
  GAME:        100000,
  PRESENTATION: 150000,
};

const NAMES: Record<string, string> = {
  TRAINING:     "Uniforme de entrenamiento",
  GAME:         "Uniforme de juego (doble faz)",
  PRESENTATION: "Uniforme de presentación",
};

const SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

const orderSchema = z.object({
  type:           z.enum(["TRAINING", "GAME", "PRESENTATION"]),
  jerseySize:     z.enum(SIZES),
  shortsSize:     z.enum(SIZES),
  nameOnJersey:   z.string().min(1).max(40).trim(),
  numberOnJersey: z.number().int().min(0).max(99).optional().nullable(),
  notes:          z.string().max(300).optional(),
});

// GET /api/uniforms - parent sees their orders
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

  const orders = await db.uniformOrder.findMany({
    where: { parentId: parent.id },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// POST /api/uniforms - parent places an order
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  if (parent.children.length === 0) {
    return NextResponse.json({ error: "No tienes un jugador vinculado" }, { status: 400 });
  }

  const { player } = parent.children[0];
  const playerId   = player.id;
  const playerName = player.user.name; // full name e.g. "Juan Carlos Pérez López"

  // --- GAME uniform validations ---
  if (parsed.data.type === "GAME") {
    // 1. Name must be player's last name (last word of full name)
    const lastName = playerName.trim().split(/\s+/).pop()!;
    if (parsed.data.nameOnJersey.toLowerCase() !== lastName.toLowerCase()) {
      return NextResponse.json(
        { error: `Para el uniforme de juego el nombre en la camiseta debe ser el apellido del deportista: "${lastName}"` },
        { status: 400 }
      );
    }

    // 2. Jersey number must be provided and unique among GAME orders
    if (parsed.data.numberOnJersey == null) {
      return NextResponse.json(
        { error: "El uniforme de juego requiere un número en la camiseta." },
        { status: 400 }
      );
    }
    const conflict = await db.uniformOrder.findFirst({
      where: {
        type: "GAME",
        numberOnJersey: parsed.data.numberOnJersey,
        status: { notIn: ["CANCELLED"] },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `El número #${parsed.data.numberOnJersey} ya está en uso en otro pedido de uniforme de juego.` },
        { status: 409 }
      );
    }
  }

  const unitPrice = PRICES[parsed.data.type];

  const order = await db.uniformOrder.create({
    data: {
      parentId:       parent.id,
      playerId,
      type:           parsed.data.type,
      jerseySize:     parsed.data.jerseySize,
      shortsSize:     parsed.data.shortsSize,
      nameOnJersey:   parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey ?? null,
      unitPrice,
      totalPrice:     unitPrice,
      notes:          parsed.data.notes ?? null,
      status:         "PENDING",
    },
  });

  // Notify admins
  try {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId:  a.id,
          title:   "Nuevo pedido de uniforme",
          message: `${playerName} solicito ${NAMES[parsed.data.type]} - Camiseta ${parsed.data.jerseySize} / Pantaloneta ${parsed.data.shortsSize}${parsed.data.numberOnJersey != null ? ` #${parsed.data.numberOnJersey}` : ""}. $${unitPrice.toLocaleString("es-CO")}.`,
          type:    "INFO",
          link:    "/dashboard/admin/uniforms",
        })),
      });
    }
  } catch {
    // Non-fatal
  }

  return NextResponse.json(order, { status: 201 });
}
