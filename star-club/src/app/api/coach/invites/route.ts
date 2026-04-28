import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST() {
  const session = await requireRole(["COACH", "ADMIN"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { coachCanInvite: true },
  });

  if (!club?.coachCanInvite && (session.user as { role: string }).role !== "ADMIN") {
    return apiError("Tu administrador no ha habilitado esta función", 403);
  }

  const code = generateCode(8);
  const invite = await db.invite.create({
    data: {
      clubId,
      code,
      role: "PLAYER",
      createdBy: session.user.id,
    },
  });

  return apiOk(invite, 201);
}
