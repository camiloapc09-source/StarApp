import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiOk, apiError, rateLimit } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/rifas/[id]/tickets/[num]/upload — upload payment proof
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const session = await requireRole(["PARENT", "PLAYER", "COACH", "ADMIN"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  if (!rateLimit(`raffle-upload:${session.user.id}`, 10, 60_000)) return apiError("Too many uploads", 429);

  const { id: raffleId, num } = await params;
  const number = parseInt(num, 10);
  if (isNaN(number)) return apiError("Número inválido", 400);

  const raffle = await db.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  const ticket = await db.raffleTicket.findUnique({ where: { raffleId_number: { raffleId, number } } });
  if (!ticket) return apiError("Número no está tomado", 404);

  // Only the owner or admin can upload proof
  if (session.user.role !== "ADMIN" && ticket.takenById !== session.user.id) {
    return apiError("No tienes permiso", 403);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No se recibió archivo", 400);
  if (!ALLOWED_TYPES.includes(file.type)) return apiError("Solo se permiten imágenes (JPG, PNG, WEBP)", 400);
  if (file.size > MAX_SIZE_BYTES) return apiError("Imagen demasiado grande (max. 5 MB)", 400);

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  await db.raffleTicket.update({
    where: { raffleId_number: { raffleId, number } },
    data: { proofUrl: dataUrl },
  });

  return apiOk({ url: dataUrl });
}
