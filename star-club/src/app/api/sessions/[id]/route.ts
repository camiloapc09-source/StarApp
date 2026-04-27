import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const sess = await db.session.findUnique({ where: { id }, select: { coachId: true, clubId: true } });
  if (!sess || sess.clubId !== clubId) return apiError("Not found", 404);

  if (session.user.role === "COACH" && sess.coachId !== session.user.id) {
    return apiError("No tienes permiso para eliminar esta sesion", 403);
  }

  await db.session.delete({ where: { id } });
  return apiOk({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json();

  const sess = await db.session.findUnique({ where: { id }, select: { coachId: true, clubId: true } });
  if (!sess || sess.clubId !== clubId) return apiError("Not found", 404);
  if (session.user.role === "COACH" && sess.coachId !== session.user.id) return apiError("Forbidden", 403);

  const allowed = ["title", "type", "date", "notes", "categoryId", "coachId", "location"] as const;
  const data: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (session.user.role === "COACH" && key === "coachId") continue;
      if (session.user.role === "COACH" && key === "type" && body.type === "EVENT") continue;
      data[key] = key === "date" ? new Date(body[key]) : body[key];
    }
  }

  const updated = await db.session.update({ where: { id }, data });
  return apiOk(updated);
}
