import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/payments/[id]/upload - parent uploads proof image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["PARENT", "PLAYER"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  if (!rateLimit(`pay-upload:${session.user.id}`, 5, 60_000)) return apiError("Too many uploads", 429);

  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment || payment.clubId !== clubId) return apiError("Payment not found", 404);

  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { playerId: true } } },
    });
    if (!parent) return apiError("Parent profile not found", 404);
    const playerIds = parent.children.map((c) => c.playerId);
    if (!playerIds.includes(payment.playerId)) return apiError("Forbidden", 403);
  } else {
    const player = await db.player.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!player || player.id !== payment.playerId) return apiError("Forbidden", 403);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided", 400);

  if (!ALLOWED_TYPES.includes(file.type)) return apiError("Solo se permiten imagenes (JPG, PNG, WEBP)", 400);
  if (file.size > MAX_SIZE_BYTES) return apiError("Imagen demasiado grande (max. 5 MB)", 400);

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  await db.payment.update({ where: { id }, data: { proofUrl: dataUrl } });

  return apiOk({ url: dataUrl });
}
