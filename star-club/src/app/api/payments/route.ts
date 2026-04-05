import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createPaymentSchema = z.object({
  playerId: z.string(),
  amount: z.number().positive(),
  concept: z.string().min(2),
  dueDate: z.string(),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]).default("PENDING"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const playerId = searchParams.get("playerId");

  const payments = await db.payment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(playerId ? { playerId } : {}),
    },
    include: {
      player: { include: { user: { select: { name: true } } } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: {
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  // Notify player
  const player = await db.player.findUnique({
    where: { id: parsed.data.playerId },
    select: { userId: true },
  });

  if (player) {
    await db.notification.create({
      data: {
        userId: player.userId,
        title: "Nuevo pago registrado 💳",
        message: `${parsed.data.concept} — $${parsed.data.amount.toLocaleString("es-CO")} con vencimiento el ${new Date(parsed.data.dueDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.`,
        type: "PAYMENT",
      },
    });
  }

  return NextResponse.json(payment, { status: 201 });
}

// PUT /api/payments — bulk generate monthly payments for all active players
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { dueDate: dueDateStr, amount: fallbackAmount, concept: defaultConcept } = body;

  if (!dueDateStr) {
    return NextResponse.json({ error: "Se requiere el mes (dueDate)." }, { status: 400 });
  }

  const targetDate = new Date(dueDateStr);
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd   = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  // Active players — include monthlyAmount for per-player pricing
  const players = await db.player.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, paymentDay: true, monthlyAmount: true },
  });

  let created = 0;
  let skipped = 0;
  let noAmount = 0;

  for (const player of players) {
    // Check if payment already exists in this month
    const existing = await db.payment.findFirst({
      where: {
        playerId: player.id,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
    });

    if (existing) { skipped++; continue; }

    // Use player's own monthlyAmount first; fall back to the provided default
    const amount = player.monthlyAmount ?? (fallbackAmount ? Number(fallbackAmount) : null);
    if (!amount || amount <= 0) { noAmount++; skipped++; continue; }

    const payDay  = player.paymentDay ?? targetDate.getDate();
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const due     = new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.min(payDay, lastDay));

    const concept = defaultConcept ?? `Mensualidad ${due.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`;

    await db.payment.create({
      data: { playerId: player.id, amount, concept, dueDate: due, status: "PENDING" },
    });

    await db.notification.create({
      data: {
        userId: player.userId,
        title: "Nuevo pago registrado 💳",
        message: `${concept} — $${amount.toLocaleString("es-CO")} con vencimiento el ${due.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.`,
        type: "PAYMENT",
      },
    });

    created++;
  }

  return NextResponse.json({ created, skipped, noAmount });
}
