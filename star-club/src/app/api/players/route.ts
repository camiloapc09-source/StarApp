import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk, getCoachCategoryFilter } from "@/lib/api";

const createPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  categoryId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  documentNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  joinDate: z.string().optional(),
  monthlyFee: z.number().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  parentRelation: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const status = searchParams.get("status");

  const categoryFilter = await getCoachCategoryFilter(session);

  const players = await db.player.findMany({
    where: {
      clubId,
      ...(categoryId ? { categoryId } : categoryFilter ? { categoryId: { in: categoryFilter } } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return apiOk(players);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = createPlayerSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const {
    name, email, password, categoryId, dateOfBirth, documentNumber,
    address, phone, joinDate, monthlyFee, parentName, parentEmail,
    parentPhone, parentRelation,
  } = parsed.data;

  const existing = await db.user.findFirst({ where: { email, clubId } });
  if (existing) return apiError("Email already in use", 400);

  const hashedPassword = await hash(password, 12);

  const user = await db.user.create({
    data: {
      name, email, password: hashedPassword, role: "PLAYER", clubId,
      playerProfile: {
        create: {
          clubId,
          categoryId: categoryId || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          documentNumber: documentNumber || null,
          address: address || null,
          phone: phone || null,
          joinDate: joinDate ? new Date(joinDate) : null,
          paymentDay: joinDate ? new Date(joinDate).getDate() : null,
          status: "PENDING",
        },
      },
    },
  });

  const playerProfile = await db.player.findFirst({ where: { userId: user.id } });

  if (parentName && parentEmail) {
    let parentUser = await db.user.findFirst({ where: { email: parentEmail, clubId } });
    if (!parentUser) {
      const rand = Math.random().toString(36).slice(2, 10);
      const parentHashed = await hash(rand, 12);
      parentUser = await db.user.create({
        data: { name: parentName, email: parentEmail, password: parentHashed, role: "PARENT", clubId },
      });
    }

    const parent = await db.parent.upsert({
      where: { userId: parentUser.id },
      create: { userId: parentUser.id, phone: parentPhone || null, relation: parentRelation || null },
      update: { phone: parentPhone || null, relation: parentRelation || null },
    });

    if (playerProfile) {
      await db.parentPlayer.create({ data: { parentId: parent.id, playerId: playerProfile.id } });
    }
  }

  try {
    if (typeof monthlyFee === "number" && joinDate && playerProfile) {
      const base = new Date(joinDate);
      const day = base.getDate();

      for (let i = 0; i < 3; i++) {
        const year = base.getFullYear();
        const month = base.getMonth() + i;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const dueDate = new Date(year, month, Math.min(day, lastDay));

        const periodStart = new Date(year, month, Math.min(day, lastDay));
        const periodEnd = new Date(year, month + 1, Math.min(day, lastDay) - 1);
        const periodLabel = `${periodStart.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

        await db.payment.create({
          data: { clubId, playerId: playerProfile.id, amount: monthlyFee, concept: `Mensualidad ${periodLabel}`, status: "PENDING", dueDate },
        });
      }
    }
  } catch (e) {
    console.error("Failed to create payment schedule", e);
  }

  await db.notification.create({
    data: {
      userId: user.id,
      title: "Bienvenido al club 🎉",
      message: "Tu cuenta ha sido creada. Completa misiones para ganar XP y subir de nivel.",
      type: "INFO",
    },
  });

  return apiOk(user, 201);
}
