import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";
import { apiOk, isResponse } from "@/lib/api";

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
    id:         c.id,
    name:       c.name,
    slug:       c.slug,
    sport:      c.sport,
    city:       c.city,
    country:    c.country,
    logo:       c.logo,
    createdAt:  c.createdAt,
    plan:       c.plan,
    counts: {
      users:    c._count.users,
      players:  c._count.players,
      sessions: c._count.sessions,
      payments: c._count.payments,
    },
  }));

  return apiOk(result);
}
