import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// POST /api/rifas/[id]/tickets — claim one or more numbers
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id: raffleId } = await params;

  const raffle = await db.raffle.findUnique({
    where: { id: raffleId },
    include: { tickets: { select: { number: true } } },
  });

  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  const body = await req.json();
  const { numbers, ownerName, assignToUserId } = body as {
    numbers: number[];
    ownerName?: string;
    assignToUserId?: string; // ADMIN only — assign to a specific parent user
  };

  if (!Array.isArray(numbers) || numbers.length === 0) return apiError("Debes seleccionar al menos un número", 400);
  if (numbers.some((n) => typeof n !== "number" || n < 0 || n > 99)) return apiError("Números inválidos (0-99)", 400);

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && raffle.status !== "OPEN") return apiError("Esta rifa no está abierta", 400);

  // Resolve target user (admin can assign to someone else)
  let targetUserId = session.user.id;
  let targetUserName = session.user.name ?? "Usuario";
  if (isAdmin && assignToUserId) {
    const targetUser = await db.user.findFirst({
      where: { id: assignToUserId, clubId },
      select: { id: true, name: true },
    });
    if (!targetUser) return apiError("Usuario no encontrado", 404);
    targetUserId = targetUser.id;
    targetUserName = targetUser.name;
  }

  const taken = new Set(raffle.tickets.map((t) => t.number));
  const conflict = numbers.find((n) => taken.has(n));
  if (conflict !== undefined) return apiError(`El número ${String(conflict).padStart(2, "0")} ya está tomado`, 409);

  const displayName = ownerName?.trim() || targetUserName;

  const tickets = await db.$transaction(
    numbers.map((num) =>
      db.raffleTicket.create({
        data: {
          raffleId,
          number: num,
          takenById: targetUserId,
          ownerName: displayName,
          status: "TAKEN",
        },
      })
    )
  );

  return apiOk(tickets, 201);
}
