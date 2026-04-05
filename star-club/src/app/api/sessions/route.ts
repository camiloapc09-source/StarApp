import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSessionSchema = z.object({
  title: z.string().min(2),
  type: z.enum(["TRAINING", "MATCH", "EVENT"]).default("TRAINING"),
  date: z.string(),
  categoryId: z.string().optional().nullable(),
  coachId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  const sessions = await db.session.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      category: true,
      coach: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Only admins can create EVENT/TOURNAMENT type sessions
  if (session.user.role === "COACH" && parsed.data.type === "EVENT") {
    return NextResponse.json({ error: "Solo el administrador puede crear eventos o torneos." }, { status: 403 });
  }

  const { coachId: bodyCoachId, ...sessionData } = parsed.data;

  // Admin can assign a specific coach; otherwise default to the current user (coach creating their own sessions)
  const resolvedCoachId = session.user.role === "ADMIN" ? (bodyCoachId ?? null) : session.user.id;

  const newSession = await db.session.create({
    data: {
      ...sessionData,
      date: new Date(sessionData.date),
      coachId: resolvedCoachId,
    },
  });

  // Notify all players and parents about the new session
  const typeLabels: Record<string, string> = { TRAINING: "Entrenamiento", MATCH: "Partido amistoso", EVENT: "Evento/Torneo" };
  const typeLabel = typeLabels[newSession.type] ?? newSession.type;
  const dateStr = new Date(newSession.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const recipients = await db.user.findMany({
    where: { role: { in: ["PLAYER", "PARENT"] } },
    select: { id: true },
  });

  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        title: `Nueva sesión: ${typeLabel}`,
        message: `${newSession.title} — ${dateStr}`,
        type: "INFO",
        link: null,
      })),
    });
  }

  return NextResponse.json(newSession, { status: 201 });
}
