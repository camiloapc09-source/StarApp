import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  emergencyContact: z.string().max(100).optional().nullable(),
  eps: z.string().max(100).optional().nullable(),
});

const playerSchema = z.object({
  address: z.string().max(200).optional().nullable(),
  position: z.string().max(60).optional().nullable(),
  jerseyNumber: z.number().int().min(0).max(99).optional().nullable(),
});

const parentSchema = z.object({
  phone: z.string().max(20).optional().nullable(),
  relation: z.string().max(60).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true,
      emergencyContact: true, eps: true, avatar: true, role: true,
      playerProfile: { select: { id: true, address: true, position: true, jerseyNumber: true, dateOfBirth: true, documentNumber: true } },
      parentProfile: { select: { id: true, phone: true, relation: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Update user-level fields
  const userParsed = userSchema.safeParse(body);
  if (!userParsed.success) {
    return NextResponse.json({ error: userParsed.error.issues[0].message }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(userParsed.data.name !== undefined && { name: userParsed.data.name }),
      ...(userParsed.data.phone !== undefined && { phone: userParsed.data.phone }),
      ...(userParsed.data.emergencyContact !== undefined && { emergencyContact: userParsed.data.emergencyContact }),
      ...(userParsed.data.eps !== undefined && { eps: userParsed.data.eps }),
    },
  });

  // Update profile-level fields based on role
  if (session.user.role === "PLAYER") {
    const playerParsed = playerSchema.safeParse(body);
    if (playerParsed.success) {
      const { jerseyNumber } = playerParsed.data;

      // Validate jersey uniqueness (only if a non-null value is being set)
      if (jerseyNumber != null) {
        const currentPlayer = await db.player.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });
        const conflict = await db.player.findFirst({
          where: { jerseyNumber, NOT: { userId: session.user.id } },
          select: { id: true },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `El dorsal #${jerseyNumber} ya está en uso por otro jugador.` },
            { status: 409 }
          );
        }
      }

      await db.player.updateMany({
        where: { userId: session.user.id },
        data: {
          ...(playerParsed.data.address !== undefined && { address: playerParsed.data.address }),
          ...(playerParsed.data.position !== undefined && { position: playerParsed.data.position }),
          ...(jerseyNumber !== undefined && { jerseyNumber }),
        },
      });
    }
  }

  if (session.user.role === "PARENT") {
    const parentParsed = parentSchema.safeParse(body);
    if (parentParsed.success) {
      await db.parent.updateMany({
        where: { userId: session.user.id },
        data: {
          ...(parentParsed.data.phone !== undefined && { phone: parentParsed.data.phone }),
          ...(parentParsed.data.relation !== undefined && { relation: parentParsed.data.relation }),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
