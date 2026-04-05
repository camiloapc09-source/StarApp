import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const sendSchema = z.object({
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(500),
  type: z.enum(["INFO", "ALERT", "ACHIEVEMENT", "PAYMENT", "ATTENDANCE"]).default("INFO"),
  link: z.string().optional().nullable(),
  // Target: "all" | "players" | "parents" | "coaches" | specific userId
  target: z.union([
    z.enum(["all", "players", "parents", "coaches"]),
    z.string(), // specific userId
  ]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.markAllRead) {
    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await db.notification.update({
      where: { id: body.id, userId: session.user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// POST /api/notifications — admin sends a notification to users
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, message, type, link, target } = parsed.data;

  let userIds: string[] = [];

  if (target === "all") {
    const users = await db.user.findMany({ select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (target === "players") {
    const users = await db.user.findMany({ where: { role: "PLAYER" }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (target === "parents") {
    const users = await db.user.findMany({ where: { role: "PARENT" }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (target === "coaches") {
    const users = await db.user.findMany({ where: { role: "COACH" }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else {
    // specific userId
    userIds = [target];
  }

  // Remove the sender from recipients
  userIds = userIds.filter((id) => id !== session.user.id);

  if (userIds.length === 0) {
    return NextResponse.json({ error: "No hay destinatarios" }, { status: 400 });
  }

  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message, type, link: link ?? null })),
  });

  return NextResponse.json({ sent: userIds.length });
}
