import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";
import { apiOk, apiError, isResponse } from "@/lib/api";

export async function GET() {
  const session = await requireSuperAdmin();
  if (isResponse(session)) return session;

  const clubs = await db.club.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users:    true,
          players:  true,
          sessions: true,
          payments: true,
        },
      },
    },
  });

  const result = clubs.map((c) => ({
    id:                 c.id,
    name:               c.name,
    slug:               c.slug,
    sport:              c.sport,
    city:               c.city,
    country:            c.country,
    logo:               c.logo,
    createdAt:          c.createdAt,
    plan:               c.plan,
    active:             c.active,
    suspendedAt:        c.suspendedAt,
    nextPaymentDue:     c.nextPaymentDue,
    subscriptionAmount: c.subscriptionAmount,
    counts: {
      users:    c._count.users,
      players:  c._count.players,
      sessions: c._count.sessions,
      payments: c._count.payments,
    },
  }));

  return apiOk(result);
}

const patchSchema = z.object({
  clubId:             z.string().min(1),
  active:             z.boolean().optional(),
  nextPaymentDue:     z.string().optional().nullable(),   // ISO date o "" para limpiar
  subscriptionAmount: z.number().min(0).optional().nullable(),
});

// PATCH /api/superadmin/clubs — actualiza la suscripción de un club
export async function PATCH(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (isResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { clubId, active, nextPaymentDue, subscriptionAmount } = parsed.data;

  const club = await db.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (!club) return apiError("Club no encontrado", 404);

  const data: Record<string, unknown> = {};
  if (typeof active === "boolean") {
    data.active = active;
    data.suspendedAt = active ? null : new Date();
  }
  if (nextPaymentDue !== undefined) {
    data.nextPaymentDue = nextPaymentDue ? new Date(nextPaymentDue) : null;
  }
  if (subscriptionAmount !== undefined) {
    data.subscriptionAmount = subscriptionAmount;
  }

  const updated = await db.club.update({
    where: { id: clubId },
    data,
    select: { id: true, active: true, suspendedAt: true, nextPaymentDue: true, subscriptionAmount: true },
  });

  return apiOk(updated);
}
