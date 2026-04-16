import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/payments/[id]/upload - parent uploads proof image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "PLAYER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Authorization per role
  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { playerId: true } } },
    });
    if (!parent) return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
    const playerIds = parent.children.map((c) => c.playerId);
    if (!playerIds.includes(payment.playerId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const player = await db.player.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!player || player.id !== payment.playerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imagenes (JPG, PNG, WEBP)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (max. 5 MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  await db.payment.update({ where: { id }, data: { proofUrl: dataUrl } });

  return NextResponse.json({ url: dataUrl });
}
