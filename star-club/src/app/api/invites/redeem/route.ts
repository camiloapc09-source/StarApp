import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { apiError, apiOk, rateLimit, getClientIp } from "@/lib/api";
import { sendParentWelcomeEmail } from "@/lib/email";

const redeemSchema = z.object({
  code: z.string().min(4),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  dateOfBirth: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  eps: z.string().optional(),
  branch: z.string().optional(),
  zone: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  parentRelation: z.string().optional(),
  relation: z.string().optional(),
  // Additional children's document numbers for PARENT self-registration
  additionalDocs: z.array(z.string().min(1)).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`redeem:${ip}`, 5, 60_000)) return apiError("Too many requests", 429);

  const body = await req.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { code, name, email, password, dateOfBirth, documentNumber, phone, address, emergencyContact, eps, branch, zone, parentName, parentEmail, parentPhone } = parsed.data;

  const invite = await db.invite.findUnique({ where: { code } });
  if (!invite) return apiError("Invite not found", 404);
  if (invite.used) return apiError("Invite already used", 400);
  if (invite.expiresAt && invite.expiresAt < new Date()) return apiError("Invite expired", 400);

  const clubId = invite.clubId;

  const existing = await db.user.findFirst({ where: { email, clubId } });
  if (existing) return apiError("Email already in use", 400);

  const role = (invite.role || "PLAYER").toUpperCase();

  if (role === "PLAYER") {
    if (!documentNumber) return apiError("Document number is required for player registration", 400);

    const hashedPlayer = await hash(documentNumber, 12);

    const user = await db.user.create({
      data: {
        clubId, name, email, password: hashedPlayer, role: "PLAYER",
        playerProfile: {
          create: {
            clubId,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            documentNumber: documentNumber || null,
            phone: phone || null,
            address: address || null,
            zone: zone || branch || null,
            status: "PENDING",
          },
        },
      },
      include: { playerProfile: true },
    });

    if (parentName && parsed.data.parentEmail) {
      // Create or find parent by their real email (never use documentNumber as credentials)
      let parentUser = await db.user.findFirst({ where: { email: parsed.data.parentEmail, clubId } });
      if (!parentUser) {
        const { randomBytes } = await import("crypto");
        const tempPassword = randomBytes(6).toString("hex");
        const parentHashed = await hash(tempPassword, 12);
        parentUser = await db.user.create({
          data: { clubId, name: parentName, email: parsed.data.parentEmail, password: parentHashed, role: "PARENT",
                  phone: parentPhone || null },
        });
      }

      let parent = await db.parent.findUnique({ where: { userId: parentUser.id } });
      if (!parent) {
        parent = await db.parent.create({
          data: { userId: parentUser.id, phone: parentPhone || null, relation: parsed.data.parentRelation || null },
        });
      }

      try {
        const playerProfileId = user.playerProfile?.id;
        if (playerProfileId) {
          await db.parentPlayer.create({ data: { parentId: parent.id, playerId: playerProfileId } });
        }
      } catch {
        // ignore duplicate relation errors
      }
    }

    await db.invite.update({ where: { id: invite.id }, data: { used: true, usedBy: user.id, usedAt: new Date() } });

    try {
      const admins = await db.user.findMany({ where: { clubId, role: "ADMIN" }, select: { id: true } });
      if (admins.length > 0) {
        const playerProfileId = user.playerProfile?.id;
        await db.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Nuevo deportista registrado",
            message: `${name} se ha registrado y está pendiente de aprobación.`,
            type: "ALERT",
            link: playerProfileId ? `/dashboard/admin/players/${playerProfileId}` : "/dashboard/admin/players",
          })),
        });
      }
    } catch {
      // Non-fatal
    }

    return apiOk(user, 201);
  }

  // ── PARENT ──────────────────────────────────────────────────────────────────
  if (role === "PARENT") {
    if (!password) return apiError("La contraseña es obligatoria", 400);

    const payload = invite.payload as { playerId?: string } | null;
    if (!payload?.playerId) return apiError("Invite inválido — sin jugador vinculado", 400);

    const primaryPlayer = await db.player.findFirst({
      where: { id: payload.playerId, clubId },
      select: { id: true },
    });
    if (!primaryPlayer) return apiError("Jugador no encontrado", 404);

    const hashed = await hash(password, 12);

    // Create user with setupCompleted=true — parent sets up their own credentials here
    const user = await db.user.create({
      data: {
        clubId, name, email, password: hashed, role: "PARENT",
        phone: phone || null,
        documentNumber: documentNumber || null,
        setupCompleted: true,
      },
    });

    const parent = await db.parent.create({
      data: {
        userId: user.id,
        phone: phone || null,
        relation: parsed.data.relation || null,
      },
    });

    // Link the primary child from the invite
    await db.parentPlayer.create({
      data: { parentId: parent.id, playerId: primaryPlayer.id },
    });

    // Link additional children by document number if provided
    const additionalDocs = parsed.data.additionalDocs ?? [];
    if (additionalDocs.length > 0) {
      const extraPlayers = await db.player.findMany({
        where: {
          clubId,
          documentNumber: { in: additionalDocs },
          // Exclude the primary child to avoid duplicate-key errors
          NOT: { id: primaryPlayer.id },
        },
        select: { id: true },
      });
      for (const ep of extraPlayers) {
        try {
          await db.parentPlayer.create({ data: { parentId: parent.id, playerId: ep.id } });
        } catch {
          // Ignore duplicates silently
        }
      }
    }

    await db.invite.update({
      where: { id: invite.id },
      data: { used: true, usedBy: user.id, usedAt: new Date() },
    });

    // Email de bienvenida al padre
    const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
    const linkedPlayer = await db.player.findUnique({
      where: { id: primaryPlayer.id },
      select: { user: { select: { name: true } } },
    });
    await sendParentWelcomeEmail({
      to: email,
      parentName: name,
      playerName: linkedPlayer?.user.name ?? "",
      clubName: club?.name ?? "Star Club",
      appUrl: process.env.NEXTAUTH_URL ?? "https://starapp.onrender.com",
    });

    return apiOk(user, 201);
  }

  // ── COACH ───────────────────────────────────────────────────────────────────
  if (!password) return apiError("Password is required", 400);
  const hashed = await hash(password, 12);

  const user = await db.user.create({
    data: {
      clubId, name, email, password: hashed, role,
      phone: phone || null,
      emergencyContact: emergencyContact || null,
      eps: eps || null,
      branch: branch || null,
    },
  });

  await db.invite.update({ where: { id: invite.id }, data: { used: true, usedBy: user.id, usedAt: new Date() } });

  return apiOk(user, 201);
}
