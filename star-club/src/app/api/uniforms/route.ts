import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

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

export async function GET() {
  const session = await requireRole(["PARENT"]);
  if (isResponse(session)) return session;

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!parent) return apiError("Parent not found", 404);

  const orders = await db.uniformOrder.findMany({
    where: { parentId: parent.id },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return apiOk(orders);
}

export async function POST(req: NextRequest) {
  const session = await requireRole(["PARENT"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body   = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!parent) return apiError("Parent not found", 404);
  if (parent.children.length === 0) return apiError("No tienes un jugador vinculado", 400);

  const { player } = parent.children[0];
  const playerId   = player.id;
  const playerName = player.user.name;

  if (parsed.data.type === "GAME") {
    const words = playerName.trim().split(/\s+/);
    const validSurnames = words.length >= 3
      ? [words[words.length - 2], words[words.length - 1]]
      : [words[words.length - 1]];

    const submittedName = parsed.data.nameOnJersey.toLowerCase();
    if (!validSurnames.some((s) => s.toLowerCase() === submittedName)) {
      return apiError(`Para el uniforme de juego el nombre debe ser un apellido del deportista: ${validSurnames.join(" o ")}`, 400);
    }

    if (parsed.data.numberOnJersey == null) {
      return apiError("El uniforme de juego requiere un número en la camiseta.", 400);
    }

    const conflict = await db.uniformOrder.findFirst({
      where: { type: "GAME", numberOnJersey: parsed.data.numberOnJersey, status: { notIn: ["CANCELLED"] } },
    });
    if (conflict) return apiError(`El número #${parsed.data.numberOnJersey} ya está en uso en otro pedido.`, 409);
  }

  const unitPrice = PRICES[parsed.data.type];

  const order = await db.uniformOrder.create({
    data: {
      parentId: parent.id, playerId,
      type: parsed.data.type, jerseySize: parsed.data.jerseySize, shortsSize: parsed.data.shortsSize,
      nameOnJersey: parsed.data.nameOnJersey, numberOnJersey: parsed.data.numberOnJersey ?? null,
      unitPrice, totalPrice: unitPrice, notes: parsed.data.notes ?? null, status: "PENDING",
    },
  });

  try {
    const admins = await db.user.findMany({ where: { clubId, role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: "Nuevo pedido de uniforme",
          message: `${playerName} solicitó ${NAMES[parsed.data.type]} - Camiseta ${parsed.data.jerseySize} / Pantaloneta ${parsed.data.shortsSize}${parsed.data.numberOnJersey != null ? ` #${parsed.data.numberOnJersey}` : ""}.`,
          type: "INFO",
          link: "/dashboard/admin/uniforms",
        })),
      });
    }
  } catch { /* non-fatal */ }

  return apiOk(order, 201);
}
