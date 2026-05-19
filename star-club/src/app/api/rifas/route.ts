import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// GET /api/rifas — list raffles for the club
export async function GET() {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const raffles = await db.raffle.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: {
      tickets: {
        select: {
          id: true,
          number: true,
          status: true,
          ownerName: true,
          takenAt: true,
          paidAt: true,
          proofUrl: true,
          takenById: true,
          takenBy: { select: { name: true } },
        },
      },
    },
  });

  return apiOk(raffles);
}

// POST /api/rifas — admin creates a new raffle
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const { title, description, prize, ticketPrice, drawDate } = body;

  if (!title || !ticketPrice) return apiError("title y ticketPrice son obligatorios", 400);
  if (typeof ticketPrice !== "number" || ticketPrice <= 0) return apiError("ticketPrice inválido", 400);

  const raffle = await db.raffle.create({
    data: {
      clubId,
      title: title.trim(),
      description: description?.trim() ?? null,
      prize: prize?.trim() ?? null,
      ticketPrice,
      drawDate: drawDate ? new Date(drawDate) : null,
    },
  });

  return apiOk(raffle, 201);
}
