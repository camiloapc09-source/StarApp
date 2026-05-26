import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const createPaymentSchema = z.object({
  playerId: z.string(),
  amount: z.number().positive(),
  concept: z.string().min(2),
  dueDate: z.string(),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]).default("PENDING"),
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const playerId = searchParams.get("playerId");

  const payments = await db.payment.findMany({
    where: {
      clubId,
      ...(status ? { status } : {}),
      ...(playerId ? { playerId } : {}),
    },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { dueDate: "asc" },
  });

  return apiOk(payments);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const player = await db.player.findUnique({
    where: { id: parsed.data.playerId },
    select: { userId: true, clubId: true },
  });
  if (!player || player.clubId !== clubId) return apiError("Player not found", 404);

  const payment = await db.payment.create({
    data: { ...parsed.data, clubId, dueDate: new Date(parsed.data.dueDate) },
  });

  await db.notification.create({
    data: {
      userId: player.userId,
      title: "Nuevo pago registrado 💳",
      message: `${parsed.data.concept} — $${parsed.data.amount.toLocaleString("es-CO")} con vencimiento el ${new Date(parsed.data.dueDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.`,
      type: "PAYMENT",
    },
  });

  return apiOk(payment, 201);
}

// PUT — bulk generate monthly payments for all active players of this club
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json().catch(() => ({}));
  const { dueDate: dueDateStr, amount: fallbackAmount, concept: defaultConcept } = body;

  if (!dueDateStr) return apiError("Se requiere el mes (dueDate).", 400);

  const targetDate = new Date(dueDateStr);
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd   = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  // Fetch zone prices from club config
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { zonePrices: true },
  });
  const zonePrices = (club?.zonePrices ?? {}) as Record<string, number>;

  const players = await db.player.findMany({
    where: { clubId, status: "ACTIVE", paymentExempt: false },
    select: { id: true, userId: true, paymentDay: true, monthlyAmount: true, zone: true, scholarshipPct: true },
  });

  let created = 0, skipped = 0, noAmount = 0;

  for (const player of players) {
    const existing = await db.payment.findFirst({
      where: { playerId: player.id, dueDate: { gte: monthStart, lte: monthEnd } },
    });

    if (existing) { skipped++; continue; }

    // Amount priority:
    // 1. Player's manually assigned monthlyAmount (already includes any scholarship)
    // 2. Zone price from club config, with scholarship % applied
    // 3. Fallback amount provided in the request
    let amount: number | null = player.monthlyAmount ?? null;

    if (!amount && player.zone && zonePrices[player.zone]) {
      const base = zonePrices[player.zone];
      const pct  = player.scholarshipPct ?? 0;
      amount = pct > 0 ? Math.round(base * (1 - pct / 100)) : base;
    }

    if (!amount && fallbackAmount) {
      const base = Number(fallbackAmount);
      const pct  = player.scholarshipPct ?? 0;
      amount = pct > 0 ? Math.round(base * (1 - pct / 100)) : base;
    }

    if (!amount || amount <= 0) { noAmount++; skipped++; continue; }

    const payDay  = player.paymentDay ?? targetDate.getDate();
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const due     = new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.min(payDay, lastDay));

    const concept = defaultConcept ?? `Mensualidad ${due.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`;

    await db.payment.create({
      data: { clubId, playerId: player.id, amount, concept, dueDate: due, status: "PENDING" },
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

  return apiOk({ created, skipped, noAmount });
}
