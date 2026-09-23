import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";
import { saveProofImage, deleteProofImage, UploadError } from "@/lib/uploads";


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

  // Antes esto guardaba la imagen como base64 DENTRO de la base de datos
  // (~6,7 MB de texto por cada foto de 5 MB). Ahora va al disco persistente y
  // en la columna queda solo la ruta. Ver src/lib/uploads.ts.
  let saved;
  try {
    saved = await saveProofImage(file, "proofs");
  } catch (err) {
    if (err instanceof UploadError) return apiError(err.message, 400);
    throw err;
  }

  // Si ya había un comprobante, se borra para no acumular basura en el disco.
  await deleteProofImage(payment.proofUrl);

  await db.payment.update({ where: { id }, data: { proofUrl: saved.url } });

  return apiOk({ url: saved.url });
}
