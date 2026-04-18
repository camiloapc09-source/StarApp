import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireRole, getClubId, isResponse, apiError, apiOk, getCoachCategoryFilter } from "@/lib/api";

const createSessionSchema = z.object({
  title: z.string().min(2),
  type: z.enum(["TRAINING", "MATCH", "EVENT"]).default("TRAINING"),
  date: z.string(),
  categoryId: z.string().optional().nullable(),
  coachId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  const categoryFilter = await getCoachCategoryFilter(session);

  const sessions = await db.session.findMany({
    where: {
      clubId,
      ...(categoryFilter ? { categoryId: { in: categoryFilter } } : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      category: true,
      coach: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });

  return apiOk(sessions);
}

export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  if (session.user.role === "COACH" && parsed.data.type === "EVENT") {
    return apiError("Solo el administrador puede crear eventos o torneos.", 403);
  }

  const { coachId: bodyCoachId, ...sessionData } = parsed.data;
  const resolvedCoachId = session.user.role === "ADMIN" ? (bodyCoachId ?? null) : session.user.id;

  const newSession = await db.session.create({
    data: { ...sessionData, clubId, date: new Date(sessionData.date), coachId: resolvedCoachId },
  });

  const typeLabels: Record<string, string> = { TRAINING: "Entrenamiento", MATCH: "Partido amistoso", EVENT: "Evento/Torneo" };
  const typeLabel = typeLabels[newSession.type] ?? newSession.type;
  const dateStr = new Date(newSession.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const recipients = await db.user.findMany({
    where: { clubId, role: { in: ["PLAYER", "PARENT"] } },
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

  return apiOk(newSession, 201);
}
