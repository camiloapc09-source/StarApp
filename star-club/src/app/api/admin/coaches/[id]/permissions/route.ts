import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

// PATCH /api/admin/coaches/[id]/permissions — toggle canInvite for a specific coach
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { canInvite } = body;
  if (typeof canInvite !== "boolean") return apiError("canInvite must be boolean", 400);

  const coach = await db.user.findUnique({
    where: { id },
    select: { id: true, clubId: true, role: true },
  });
  if (!coach || coach.clubId !== clubId || coach.role !== "COACH") {
    return apiError("Entrenador no encontrado", 404);
  }

  const updated = await db.user.update({
    where: { id },
    data: { canInvite },
    select: { id: true, name: true, canInvite: true },
  });

  return apiOk(updated);
}
