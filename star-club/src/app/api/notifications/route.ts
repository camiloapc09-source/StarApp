import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const sendSchema = z.object({
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(500),
  type: z.enum(["INFO", "ALERT", "ACHIEVEMENT", "PAYMENT", "ATTENDANCE"]).default("INFO"),
  link: z.string().optional().nullable(),
  target: z.union([
    z.enum(["all", "players", "parents", "coaches"]),
    z.string(),
  ]),
});

export async function GET(_req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return apiOk(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const body = await req.json();

  if (body.markAllRead) {
    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return apiOk({ ok: true });
  }

  if (body.id) {
    await db.notification.update({
      where: { id: body.id, userId: session.user.id },
      data: { isRead: true },
    });
    return apiOk({ ok: true });
  }

  return apiError("Invalid request", 400);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { title, message, type, link, target } = parsed.data;

  const roleMap: Record<string, string> = {
    players: "PLAYER",
    parents: "PARENT",
    coaches: "COACH",
  };

  let userIds: string[];

  if (target === "all") {
    const users = await db.user.findMany({ where: { clubId }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (roleMap[target]) {
    const users = await db.user.findMany({ where: { clubId, role: roleMap[target] }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else {
    userIds = [target];
  }

  userIds = userIds.filter((id) => id !== session.user.id);

  if (userIds.length === 0) return apiError("No hay destinatarios", 400);

  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message, type, link: link ?? null })),
  });

  return apiOk({ sent: userIds.length });
}
