import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  categoryId: z.string().optional().nullable(),
  jerseyNumber: z.number().optional().nullable(),
  position: z.string().optional().nullable(),
  xp: z.number().optional(),
  paymentDay: z.number().min(1).max(31).optional(),
  monthlyAmount: z.number().min(0).optional().nullable(),
  joinDate: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  documentNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  // also allow updating linked user name
  userName: z.string().min(2).max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      category: true,
      attendances: {
        include: { session: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      payments: { orderBy: { dueDate: "desc" }, take: 10 },
      playerMissions: {
        include: { mission: true },
        orderBy: { assignedAt: "desc" },
      },
      rewards: { include: { reward: true } },
    },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(player);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Separate user-level update (userName) from player-level
  const { userName, joinDate, dateOfBirth, categoryId, ...playerData } = parsed.data;

  // Update user name separately to avoid Prisma mixed-update type conflicts
  if (userName !== undefined) {
    const player = await db.player.findUnique({ where: { id }, select: { userId: true } });
    if (player) await db.user.update({ where: { id: player.userId }, data: { name: userName } });
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

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deleting the user cascades to player profile
  await db.user.delete({ where: { id: player.userId } });

  return NextResponse.json({ success: true });
}
