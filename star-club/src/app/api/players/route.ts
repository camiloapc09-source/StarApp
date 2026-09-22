import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk, getCoachCategoryFilter } from "@/lib/api";
import { parseDateOnly, dayOfMonthFromDateOnly, buildDueDate, clubToday } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";

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
    select: { plan: true, zonePrices: true, billingCycleDay: true, country: true },
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
      // El celular se guarda TAMBIÉN en el usuario, no solo en el perfil de
      // jugador. El panel de cobros leía únicamente `User.phone`, así que a
      // estos deportistas no les aparecía el botón de WhatsApp.
      ...(phone ? { phone } : {}),
      playerProfile: {
        create: {
          clubId,
          categoryId: categoryId || null,
          zone: zone || null,
          monthlyAmount: resolvedMonthlyFee ?? null,
          dateOfBirth: dateOfBirth ? parseDateOnly(dateOfBirth) : null,
          documentNumber: documentNumber || null,
          address: address || null,
          phone: phone || null,
          joinDate: joinDate ? parseDateOnly(joinDate) : null,
          // `new Date(str).getDate()` se corría un día en Colombia (UTC-5).
          paymentDay: club?.billingCycleDay ?? (joinDate ? dayOfMonthFromDateOnly(joinDate) : null),
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
    const reusedExisting = parentUser !== null;

    // Reutilizar el acudiente existente cuando es la misma persona.
    //
    // El correo de respaldo se arma con el documento DEL HIJO
    // (`${documentNumber}@club.local`), así que al inscribir a dos hermanos sin
    // correo del acudiente se creaban DOS cuentas para el mismo papá. De ahí
    // salían los botones de "fusionar acudientes" y "corregir correo".
    // El celular identifica a la persona mucho mejor que el documento del hijo.
    if (!parentUser && parentPhone) {
      const normalized = normalizePhone(parentPhone, club?.country);
      if (normalized) {
        const existingParents = await db.user.findMany({
          where: { clubId, role: "PARENT", phone: { not: null } },
          select: { id: true, name: true, phone: true },
        });
        const match = existingParents.find(
          (u) => normalizePhone(u.phone, club?.country) === normalized,
        );
        if (match) parentUser = await db.user.findUnique({ where: { id: match.id } });
      }
    }

    // Si la cuenta ya existía (por correo o por celular), su contraseña sigue
    // siendo la suya: la temporal que generamos arriba no se aplica.
    const isNewParentAccount = !reusedExisting && parentUser === null;

    if (!parentUser) {
      parentUser = await db.user.create({
        data: { name: parentName, email: parentLoginEmail, password: parentHashed, role: "PARENT", clubId,
          ...(parentPhone ? { phone: parentPhone } : {}) },
      });
    } else if (parentPhone) {
      // El acudiente ya existía: antes su celular NO se actualizaba nunca, así
      // que un número corregido más tarde jamás llegaba a la base.
      parentUser = await db.user.update({
        where: { id: parentUser.id },
        data: { phone: parentPhone },
      });
    }

    const parent = await db.parent.upsert({
      where: { userId: parentUser.id },
      create: { userId: parentUser.id, phone: parentPhone || null, relation: parentRelation || null },
      update: { phone: parentPhone || null, relation: parentRelation || null },
    });

    if (playerProfile) {
      // El vínculo puede existir ya si se reutilizó el acudiente.
      await db.parentPlayer.upsert({
        where: { parentId_playerId: { parentId: parent.id, playerId: playerProfile.id } },
        create: { parentId: parent.id, playerId: playerProfile.id },
        update: {},
      });
    }

    // Solo se anuncia una contraseña temporal cuando la cuenta es nueva. Si se
    // reutilizó un acudiente existente, esa clave no sirve y compartirla
    // dejaba al papá sin poder entrar.
    await db.notification.create({
      data: {
        userId: session.user.id,
        title: isNewParentAccount ? "Cuenta de acudiente creada" : "Deportista vinculado a un acudiente existente",
        message: isNewParentAccount
          ? `Acudiente: ${parentName} | Login: ${parentLoginEmail} | Contraseña temporal: ${tempPassword} — compártela y pídele que la cambie.`
          : `${name} quedó vinculado a la cuenta de ${parentUser.name} (${parentUser.email}), que ya existía. Conserva su contraseña actual.`,
        type: "INFO",
      },
    });

    if (isNewParentAccount) {
      parentTempPassword = tempPassword;
      parentLoginEmailResult = parentLoginEmail;
    }
  }

  try {
    if (typeof resolvedMonthlyFee === "number" && playerProfile) {
      const cycleDay = club?.billingCycleDay ?? (joinDate ? dayOfMonthFromDateOnly(joinDate) : 1);
      // `parseDateOnly` evita que la fecha de ingreso se corra al día anterior.
      const base = joinDate ? parseDateOnly(joinDate) : clubToday();

      // El primer cobro arranca en el ciclo actual si el día aún no ha pasado,
      // o en el siguiente si ya pasó.
      let startMonth = base.getMonth();
      const startYear = base.getFullYear();
      if (base.getDate() > cycleDay) startMonth += 1;

      const schedule = [];
      for (let i = 0; i < 3; i++) {
        const dueDate = buildDueDate(startYear, startMonth + i, cycleDay);
        const periodEnd = new Date(buildDueDate(startYear, startMonth + i + 1, cycleDay).getTime() - 86_400_000);
        const periodLabel = `${dueDate.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

        schedule.push({
          clubId, playerId: playerProfile.id, amount: resolvedMonthlyFee,
          concept: `Mensualidad ${periodLabel}`, status: "PENDING", dueDate,
        });
      }
      // Una sola escritura en vez de tres consultas en serie.
      await db.payment.createMany({ data: schedule });
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
