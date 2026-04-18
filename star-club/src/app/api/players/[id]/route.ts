import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  categoryId: z.string().optional().nullable(),
  jerseyNumber: z.number().optional().nullable(),
  position: z.string().optional().nullable(),
  xp: z.number().optional(),
  paymentDay: z.number().min(1).max(31).optional().nullable(),
  monthlyAmount: z.number().min(0).optional().nullable(),
  joinDate: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  documentNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  userName: z.string().min(2).max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      category: true,
      attendances: { include: { session: true }, orderBy: { createdAt: "desc" }, take: 20 },
      payments: { orderBy: { dueDate: "desc" }, take: 10 },
      playerMissions: { include: { mission: true }, orderBy: { assignedAt: "desc" } },
      rewards: { include: { reward: true } },
    },
  });

  if (!player || player.clubId !== clubId) return apiError("Not found", 404);
  return apiOk(player);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const player = await db.player.findUnique({ where: { id }, select: { userId: true, clubId: true } });
  if (!player || player.clubId !== clubId) return apiError("Not found", 404);

  const { userName, joinDate, dateOfBirth, categoryId, ...playerData } = parsed.data;

  if (userName !== undefined) {
    await db.user.update({ where: { id: player.userId }, data: { name: userName } });
  }

  const updated = await db.player.update({
    where: { id },
    data: {
      ...playerData,
      ...(categoryId !== undefined && { categoryId: categoryId ?? null }),
      ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
    },
  });

  return apiOk(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const player = await db.player.findUnique({ where: { id }, select: { userId: true, clubId: true } });
  if (!player || player.clubId !== clubId) return apiError("Not found", 404);

  await db.user.delete({ where: { id: player.userId } });
  return apiOk({ ok: true });
}
