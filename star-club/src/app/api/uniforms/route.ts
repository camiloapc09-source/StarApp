import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import {
  UNIFORM_PRICES,
  UNIFORM_SIZES,
  validateGameUniform,
  notifyAdminsNewOrder,
} from "@/lib/uniforms";

const orderSchema = z.object({
  // Opcional: un acudiente con varios hijos elige a cuál pedirle el uniforme.
  playerId:       z.string().min(1).optional(),
  type:           z.enum(["TRAINING", "GAME", "PRESENTATION"]),
  jerseySize:     z.enum(UNIFORM_SIZES),
  shortsSize:     z.enum(UNIFORM_SIZES),
  nameOnJersey:   z.string().min(1).max(40).trim(),
  numberOnJersey: z.number().int().min(0).max(99).optional().nullable(),
  notes:          z.string().max(300).optional(),
});

type Requester = {
  parentId: string | null;
  role: "PARENT" | "PLAYER";
  /** Deportistas que este usuario puede pedir. */
  players: { id: string; name: string }[];
};

/**
 * Resuelve a qué deportistas puede pedirle uniformes quien hace la llamada:
 * el acudiente a sus hijos vinculados, el deportista solo a sí mismo.
 */
async function resolveRequester(
  userId: string,
  role: string,
  clubId: string
): Promise<Requester | null> {
  if (role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId },
      include: {
        children: {
          include: { player: { include: { user: { select: { name: true } } } } },
        },
      },
    });
    if (!parent) return null;
    return {
      parentId: parent.id,
      role: "PARENT",
      players: parent.children
        .filter((c) => c.player.clubId === clubId)
        .map((c) => ({ id: c.player.id, name: c.player.user.name })),
    };
  }

  const player = await db.player.findUnique({
    where: { userId },
    include: { user: { select: { name: true } } },
  });
  if (!player || player.clubId !== clubId) return null;
  return {
    parentId: null,
    role: "PLAYER",
    players: [{ id: player.id, name: player.user.name }],
  };
}

export async function GET() {
  // COACH entra solo si tiene perfil de deportista; si no, resolveRequester lo rechaza.
  const session = await requireRole(["PARENT", "PLAYER", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const requester = await resolveRequester(session.user.id, session.user.role, clubId);
  if (!requester) return apiError("Perfil no encontrado", 404);

  const orders = await db.uniformOrder.findMany({
    where: { playerId: { in: requester.players.map((p) => p.id) } },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return apiOk(orders);
}

export async function POST(req: NextRequest) {
  // COACH entra solo si tiene perfil de deportista; si no, resolveRequester lo rechaza.
  const session = await requireRole(["PARENT", "PLAYER", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body   = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const requester = await resolveRequester(session.user.id, session.user.role, clubId);
  if (!requester) return apiError("Perfil no encontrado", 404);
  if (requester.players.length === 0) {
    return apiError(
      requester.role === "PARENT"
        ? "No tienes un deportista vinculado"
        : "Tu cuenta no está vinculada a un deportista",
      400
    );
  }

  // Sin playerId explícito se usa el único deportista disponible.
  const target = parsed.data.playerId
    ? requester.players.find((p) => p.id === parsed.data.playerId)
    : requester.players.length === 1
      ? requester.players[0]
      : null;

  if (!target) {
    return apiError(
      parsed.data.playerId
        ? "No puedes pedir uniformes para ese deportista"
        : "Selecciona el deportista del pedido",
      parsed.data.playerId ? 403 : 400
    );
  }

  if (parsed.data.type === "GAME") {
    const problem = await validateGameUniform({
      clubId,
      playerName: target.name,
      nameOnJersey: parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey,
      enforceName: true,
    });
    if (problem) return apiError(problem, problem.includes("ya está en uso") ? 409 : 400);
  }

  const unitPrice = UNIFORM_PRICES[parsed.data.type];

  const order = await db.uniformOrder.create({
    data: {
      parentId:       requester.parentId,
      playerId:       target.id,
      type:           parsed.data.type,
      jerseySize:     parsed.data.jerseySize,
      shortsSize:     parsed.data.shortsSize,
      nameOnJersey:   parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey ?? null,
      unitPrice,
      totalPrice:     unitPrice,
      notes:          parsed.data.notes ?? null,
      status:         "PENDING",
      createdById:    session.user.id,
      createdByRole:  requester.role,
    },
  });

  await notifyAdminsNewOrder({
    clubId,
    playerName:     target.name,
    type:           parsed.data.type,
    jerseySize:     parsed.data.jerseySize,
    shortsSize:     parsed.data.shortsSize,
    numberOnJersey: parsed.data.numberOnJersey,
    origin:         requester.role,
  });

  return apiOk(order, 201);
}
