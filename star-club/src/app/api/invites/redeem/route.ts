import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";

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
  const body = await req.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { code, name, email, password, dateOfBirth, documentNumber, phone, address, emergencyContact, eps, branch, parentName, parentEmail, parentPhone } = parsed.data;

  const invite = await db.invite.findUnique({ where: { code } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.used) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  if (invite.expiresAt && invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

  // Handle player vs coach logic
  const role = (invite.role || "PLAYER").toUpperCase();

  if (role === "PLAYER") {
    if (!documentNumber) return NextResponse.json({ error: "Document number is required for player registration" }, { status: 400 });

    const hashedPlayer = await hash(documentNumber, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPlayer,
        role: "PLAYER",
        playerProfile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            documentNumber: documentNumber || null,
            phone: phone || null,            address: address || null,            status: "PENDING",
          },
        },
      },
      include: { playerProfile: true },
    });

    // If parent data provided, create parent user and link
    if (parentName && parentEmail) {
      let parentUser = await db.user.findUnique({ where: { email: parentEmail } });
      if (!parentUser) {
        const parentHashed = await hash(documentNumber, 12);
        parentUser = await db.user.create({ data: { name: parentName, email: parentEmail, password: parentHashed, role: "PARENT" } });
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
        // update parent relation if provided
        if (parsed.data.parentRelation) {
          await db.parent.update({ where: { id: parent.id }, data: { relation: parsed.data.parentRelation } });
        }
      } catch (e) {
        // ignore duplicate relation errors
      }
    }

    await db.invite.update({ where: { id: invite.id }, data: { used: true, usedBy: user.id, usedAt: new Date() } });

    // Notify all admins of the new pending registration
    try {
      const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
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
      // Non-fatal  don't block registration if notification fails
    }

    return NextResponse.json(user, { status: 201 });
  }

  // Default: coach or other roles - require password
  if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  const hashed = await hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role,
      phone: phone || null,
      emergencyContact: emergencyContact || null,
      eps: eps || null,
      branch: branch || null,
    },
  });

  await db.invite.update({ where: { id: invite.id }, data: { used: true, usedBy: user.id, usedAt: new Date() } });

  return NextResponse.json(user, { status: 201 });
}
