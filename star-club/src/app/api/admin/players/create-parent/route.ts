import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  parentName:  z.string().min(2),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  playerIds:   z.array(z.string()).min(1),
});

// POST /api/admin/players/create-parent
// Creates a PARENT account and links specified players as children.
// If the email belongs to a PLAYER in the club, that player's email is moved
// to {docNumber}@club.local so the parent can reclaim the original address.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { parentName, parentEmail, parentPhone, playerIds } = parsed.data;

  // Validate players belong to this club
  const validPlayers = await db.player.findMany({
    where: { id: { in: playerIds }, clubId },
    select: { id: true },
  });
  if (validPlayers.length !== playerIds.length) return apiError("Uno o más jugadores no válidos", 400);

  // Check if email is already in use
  const existing = await db.user.findFirst({
    where: { email: parentEmail, clubId },
    include: { playerProfile: { select: { id: true, documentNumber: true } } },
  });

  if (existing) {
    if (existing.role === "PARENT") {
      return apiError(
        "Este correo ya pertenece a un acudiente registrado. Usa 'Vincular padre existente' para conectarlo con este jugador.",
        409
      );
    }
    if (existing.role === "PLAYER") {
      // Reassign player to a doc-based email so parent can use the real address
      const doc = existing.playerProfile?.documentNumber;
      const fallbackEmail = doc ? `${doc}@club.local` : `player.${existing.id}@club.local`;

      const fallbackTaken = await db.user.findFirst({ where: { email: fallbackEmail, clubId } });
      if (fallbackTaken) {
        return apiError(
          `El correo ya está en uso por el jugador ${existing.name}. Cambia manualmente el correo de ese jugador primero y luego intenta de nuevo.`,
          409
        );
      }
      await db.user.update({ where: { id: existing.id }, data: { email: fallbackEmail } });
    } else {
      return apiError("Este correo ya está en uso por otro usuario del club.", 409);
    }
  }

  const tempPassword = randomBytes(5).toString("hex");
  const hashedPassword = await hash(tempPassword, 12);

  const parentUser = await db.user.create({
    data: {
      name: parentName,
      email: parentEmail,
      password: hashedPassword,
      role: "PARENT",
      clubId,
      ...(parentPhone ? { phone: parentPhone } : {}),
    },
  });

  const parent = await db.parent.create({
    data: { userId: parentUser.id, phone: parentPhone ?? null },
  });

  await db.parentPlayer.createMany({
    data: playerIds.map((playerId) => ({ parentId: parent.id, playerId })),
    skipDuplicates: true,
  });

  await db.notification.create({
    data: {
      userId: session.user.id,
      title: "Cuenta de acudiente creada",
      message: `Acudiente: ${parentName} | Email: ${parentEmail} | Contraseña temporal: ${tempPassword} — compártela y pídele que la cambie.`,
      type: "INFO",
    },
  });

  return apiOk({ parentId: parentUser.id, tempPassword, email: parentEmail }, 201);
}
