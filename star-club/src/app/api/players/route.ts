import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";

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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const status = searchParams.get("status");

  const players = await db.player.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPlayerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    name,
    email,
    password,
    categoryId,
    dateOfBirth,
    documentNumber,
    address,
    phone,
    joinDate,
    monthlyFee,
    parentName,
    parentEmail,
    parentPhone,
    parentRelation,
  } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const hashedPassword = await hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "PLAYER",
      playerProfile: {
        create: {
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
    // not including nested playerProfile here to avoid strict client types; we'll query it below
  });

  // fetch the created player profile
  const playerProfile = await db.player.findFirst({ where: { userId: user.id } });

  // If parent info provided, create parent user and link
  if (parentName && parentEmail) {
    // create or reuse parent user
    let parentUser = await db.user.findUnique({ where: { email: parentEmail } });
    if (!parentUser) {
      const rand = Math.random().toString(36).slice(2, 10);
      const parentHashed = await hash(rand, 12);
      parentUser = await db.user.create({
        data: { name: parentName, email: parentEmail, password: parentHashed, role: "PARENT" },
      });
    }

    const parent = await db.parent.upsert({
      where: { userId: parentUser.id },
      create: { userId: parentUser.id, phone: parentPhone || null, relation: parentRelation || null },
      update: { phone: parentPhone || null, relation: parentRelation || null },
    });

    // link parent to player
    if (playerProfile) {
      await db.parentPlayer.create({ data: { parentId: parent.id, playerId: playerProfile.id } });
    }
  }

  // Create payment schedule: 3 months from joinDate, one per cycle
  try {
    if (typeof monthlyFee === "number" && joinDate && playerProfile) {
      const base = new Date(joinDate);
      const day = base.getDate();

      // Generate 3 monthly payments starting from the join month
      for (let i = 0; i < 3; i++) {
        const year = base.getFullYear();
        const month = base.getMonth() + i;
        // Clamp day to last day of month
        const lastDay = new Date(year, month + 1, 0).getDate();
        const dueDate = new Date(year, month, Math.min(day, lastDay));

        const periodStart = new Date(year, month, Math.min(day, lastDay));
        const periodEnd = new Date(year, month + 1, Math.min(day, lastDay) - 1);
        const periodLabel = `${periodStart.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

        await db.payment.create({
          data: {
            playerId: playerProfile.id,
            amount: monthlyFee,
            concept: `Mensualidad ${periodLabel}`,
            status: "PENDING",
            dueDate,
          },
        });
      }
    }
  } catch (e) {
    console.error("Failed to create payment schedule", e);
  }

  // Welcome notification
  await db.notification.create({
    data: {
      userId: user.id,
      title: "Welcome to Star Club! 🎉",
      message: "Your account has been created. Start completing missions to earn XP and level up!",
      type: "INFO",
    },
  });

  return NextResponse.json(user, { status: 201 });
}
