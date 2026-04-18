import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { apiError, apiOk, rateLimit, getClientIp } from "@/lib/api";

const redeemSchema = z.object({
  code: z.string().min(4),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().optional(),
  dateOfBirth: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  eps: z.string().optional(),
  branch: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  parentRelation: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`redeem:${ip}`, 5, 60_000)) return apiError("Too many requests", 429);

  const body = await req.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { code, name, email, password, dateOfBirth, documentNumber, phone, address, emergencyContact, eps, branch, parentName, parentEmail, parentPhone } = parsed.data;

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
            status: "PENDING",
          },
        },
      },
      include: { playerProfile: true },
    });

    if (parentName) {
      // Parent login: email = player's documentNumber, password = player's documentNumber
      const parentLoginId = documentNumber;
      let parentUser = await db.user.findFirst({ where: { email: parentLoginId, clubId } });
      if (!parentUser) {
        const parentHashed = await hash(documentNumber, 12);
        parentUser = await db.user.create({
          data: { clubId, name: parentName, email: parentLoginId, password: parentHashed, role: "PARENT" },
        });
      }

      const parent = await db.parent.upsert({
        where: { userId: parentUser.id },
        create: { userId: parentUser.id, phone: parentPhone || null, relation: null },
        update: { phone: parentPhone || null, relation: null },
      });

      try {
        const playerProfileId = user.playerProfile?.id;
        if (playerProfileId) {
          await db.parentPlayer.create({ data: { parentId: parent.id, playerId: playerProfileId } });
        }
        if (parsed.data.parentRelation) {
          await db.parent.update({ where: { id: parent.id }, data: { relation: parsed.data.parentRelation } });
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
