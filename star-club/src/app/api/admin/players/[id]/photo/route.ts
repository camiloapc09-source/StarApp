import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

// POST /api/admin/players/[id]/photo
// Admin uploads a player photo directly (no approval flow)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    select: { userId: true, clubId: true },
  });
  if (!player || player.clubId !== clubId) return apiError("Jugador no encontrado", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No se recibió ninguna imagen", 400);
  if (!ALLOWED_TYPES.includes(file.type)) return apiError("Solo JPG, PNG o WEBP", 400);
  if (file.size > MAX_SIZE) return apiError("Imagen demasiado grande (máx. 8 MB)", 400);

  const bytes = await file.arrayBuffer();
  const raw = Buffer.from(bytes);

  const buffer = await sharp(raw)
    .resize(600, 800, { fit: "cover", position: "top" })
    .webp({ quality: 85 })
    .toBuffer();

  const token = randomBytes(16).toString("hex");
  const filename = `player-${token}.webp`;

  const uploadDir = join(process.cwd(), "public", "uploads", "players");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  const url = `/uploads/players/${filename}`;

  // Set avatar directly (approved, no review needed since admin uploaded it)
  await db.user.update({
    where: { id: player.userId },
    data: { avatar: url, avatarStatus: "APPROVED" },
  });

  return apiOk({ url });
}

// DELETE /api/admin/players/[id]/photo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    select: { userId: true, clubId: true },
  });
  if (!player || player.clubId !== clubId) return apiError("Jugador no encontrado", 404);

  await db.user.update({
    where: { id: player.userId },
    data: { avatar: null, avatarStatus: "NONE" },
  });

  return apiOk({ ok: true });
}
