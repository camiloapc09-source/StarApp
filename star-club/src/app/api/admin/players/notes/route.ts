import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const postSchema = z.object({
  playerId: z.string().min(1),
  body:     z.string().min(1).max(2000),
});

const deleteSchema = z.object({
  noteId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { playerId, body: noteBody } = parsed.data;

  // Verify player belongs to club
  const player = await db.player.findFirst({ where: { id: playerId, clubId }, select: { id: true } });
  if (!player) return apiError("Jugador no encontrado", 404);

  const note = await db.playerNote.create({
    data: { clubId, playerId, authorId: session.user.id, body: noteBody },
  });

  return apiOk({ note });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const note = await db.playerNote.findFirst({ where: { id: parsed.data.noteId, clubId } });
  if (!note) return apiError("Nota no encontrada", 404);

  await db.playerNote.delete({ where: { id: parsed.data.noteId } });
  return apiOk({ deleted: true });
}
