import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { apiError, apiOk } from "@/lib/api";

// GET /api/parent/setup — list of players in the club + already-linked ones + current user info
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") return apiError("No autorizado", 401);

  const userId = (session.user as any).id as string;
  const clubId = (session.user as any).clubId as string;
  const clubSlug = (session.user as any).clubSlug as string ?? "";
  const currentEmail = (session.user as any).email as string ?? "";

  const parent = await db.parent.findUnique({
    where: { userId },
    select: { id: true, children: { select: { playerId: true } } },
  });
  const linkedIds = new Set(parent?.children.map((c) => c.playerId) ?? []);

  const players = await db.player.findMany({
    where: { clubId, status: "ACTIVE" },
    select: {
      id: true,
      user: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return apiOk({
    currentEmail,
    clubSlug,
    players: players.map((p) => ({
      id: p.id,
      name: p.user.name,
      category: p.category?.name ?? null,
      linked: linkedIds.has(p.id),
    })),
  });
}

const schema = z.object({
  email:     z.string().email("Ingresa un correo electrónico válido"),
  password:  z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  playerIds: z.array(z.string()).min(1, "Selecciona al menos un jugador"),
});

// PATCH /api/parent/setup — update credentials + link children + mark setupCompleted
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") return apiError("No autorizado", 401);

  const userId = (session.user as any).id as string | undefined;
  if (!userId) return apiError("Sesión inválida", 401);

  const clubId = (session.user as any).clubId as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { email, password, playerIds } = parsed.data;

  // Validate email not taken by another user in this club
  const existing = await db.user.findFirst({
    where: { email, clubId, NOT: { id: userId } },
  });
  if (existing) return apiError("Este correo ya está en uso en tu club", 409);

  // Validate all playerIds belong to this club
  const validPlayers = await db.player.findMany({
    where: { id: { in: playerIds }, clubId },
    select: { id: true },
  });
  if (validPlayers.length !== playerIds.length) return apiError("Jugador no válido", 400);

  // Get or create parent profile
  let parent = await db.parent.findUnique({ where: { userId } });
  if (!parent) {
    parent = await db.parent.create({ data: { userId } });
  }
  const parentId = parent.id;

  const hashed = await hash(password, 12);

  // Update credentials, re-link children, mark setup done — all in one transaction
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { email, password: hashed, setupCompleted: true },
    }),
    db.parentPlayer.deleteMany({ where: { parentId } }),
    ...playerIds.map((playerId) =>
      db.parentPlayer.create({ data: { parentId, playerId } })
    ),
  ]);

  return apiOk({ ok: true });
}
