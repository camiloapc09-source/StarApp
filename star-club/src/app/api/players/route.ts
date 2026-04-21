import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk, getCoachCategoryFilter } from "@/lib/api";

const createPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  categoryId: z.string().optional(),
  zone: z.enum(["SUR", "CENTRO", "NORTE"]).optional(),
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
    name, email, password, categoryId, zone, dateOfBirth, documentNumber,
    address, phone, joinDate, monthlyFee, parentName, parentEmail,
    parentPhone, parentRelation,
  } = parsed.data;

  const existing = await db.user.findFirst({ where: { email, clubId } });
  if (existing) return apiError("Email already in use", 400);

  // Single query — needs plan + zonePrices + billingCycleDay
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { plan: true, zonePrices: true, billingCycleDay: true },
  });

  // Plan enforcement — check player limit
  const { getLimits } = await import("@/lib/plans");
  const limits = getLimits(club?.plan ?? "STARTER");
  if (limits.maxPlayers !== Infinity) {
    const activeCount = await db.player.count({ where: { clubId, status: "ACTIVE" } });
    if (activeCount >= limits.maxPlayers) {
      return apiError(
        `Tu plan ${club?.plan ?? "STARTER"} permite máximo ${limits.maxPlayers} jugadores activos. Actualiza a PRO para agregar más.`,
        403
      );
    }
  }

  // Resolve monthlyAmount: prefer explicit fee, else derive from club zone prices
  const zonePrices = club?.zonePrices as Record<string, number> | null;
  const resolvedMonthlyFee = monthlyFee ?? (zone && zonePrices ? zonePrices[zone] : undefined);

  const hashedPassword = await hash(password, 12);

  const user = await db.user.create({
    data: {
      name, email, password: hashedPassword, role: "PLAYER", clubId,
      playerProfile: {
        create: {
          clubId,
          categoryId: categoryId || null,
          zone: zone || null,
          monthlyAmount: resolvedMonthlyFee ?? null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          documentNumber: documentNumber || null,
          address: address || null,
          phone: phone || null,
          joinDate: joinDate ? new Date(joinDate) : null,
          paymentDay: club?.billingCycleDay ?? (joinDate ? new Date(joinDate).getDate() : null),
          status: "PENDING",
        },
      },
    },
  });

  const playerProfile = await db.player.findFirst({ where: { userId: user.id } });
  let parentTempPassword: string | undefined;
  let parentLoginEmailResult: string | undefined;

  if (parentName && (parentEmail || documentNumber)) {
    // Use parentEmail as login if provided, else fall back to documentNumber
    const parentLoginEmail = parentEmail || `${documentNumber}@club.local`;
    // Generate a random temporary password — NOT the document number
    const tempPassword = randomBytes(5).toString("hex"); // 10 chars
    const parentHashed = await hash(tempPassword, 12);

    let parentUser = await db.user.findFirst({ where: { email: parentLoginEmail, clubId } });
    if (!parentUser) {
      parentUser = await db.user.create({
        data: { name: parentName, email: parentLoginEmail, password: parentHashed, role: "PARENT", clubId,
          ...(parentPhone ? { phone: parentPhone } : {}) },
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

    // Notify admin with the temporary password so they can share it with the parent
    await db.notification.create({
      data: {
        userId: session.user.id,
        title: "Cuenta de acudiente creada",
        message: `Acudiente: ${parentName} | Login: ${parentLoginEmail} | Contraseña temporal: ${tempPassword} — compártela y pídele que la cambie.`,
        type: "INFO",
      },
    });

    parentTempPassword = tempPassword;
    parentLoginEmailResult = parentLoginEmail;
  }

  try {
    if (typeof resolvedMonthlyFee === "number" && playerProfile) {
      const cycleDay = club?.billingCycleDay ?? (joinDate ? new Date(joinDate).getDate() : 1);
      const base = joinDate ? new Date(joinDate) : new Date();
      // Start billing from the current or next cycle period
      let startMonth = base.getMonth();
      let startYear = base.getFullYear();
      if (base.getDate() > cycleDay) { startMonth += 1; }
      if (startMonth > 11) { startMonth = 0; startYear += 1; }

      for (let i = 0; i < 3; i++) {
        const month = (startMonth + i) % 12;
        const year = startYear + Math.floor((startMonth + i) / 12);
        const lastDay = new Date(year, month + 1, 0).getDate();
        const dueDate = new Date(year, month, Math.min(cycleDay, lastDay));

        const endMonth = (month + 1) % 12;
        const endYear = year + Math.floor((month + 1) / 12);
        const endLastDay = new Date(endYear, endMonth + 1, 0).getDate();
        const periodEnd = new Date(endYear, endMonth, Math.min(cycleDay - 1, endLastDay));
        const periodLabel = `${dueDate.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

        await db.payment.create({
          data: { clubId, playerId: playerProfile.id, amount: resolvedMonthlyFee, concept: `Mensualidad ${periodLabel}`, status: "PENDING", dueDate },
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

  return apiOk({
    ...user,
    ...(parentTempPassword ? { parentTempPassword, parentLoginEmail: parentLoginEmailResult } : {}),
  }, 201);
}
