import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const sess = await db.session.findUnique({
    where: { id },
    select: { coachId: true },
  });

  if (!sess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Coaches can only delete their own sessions; admins can delete any
  if (session.user.role === "COACH" && sess.coachId !== session.user.id) {
    return NextResponse.json({ error: "No tienes permiso para eliminar esta sesion" }, { status: 403 });
  }

  await db.session.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const sess = await db.session.findUnique({ where: { id }, select: { coachId: true } });
  if (!sess) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === "COACH" && sess.coachId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = ["title", "type", "date", "notes", "categoryId", "coachId"] as const;
  const data: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      // Coaches cannot reassign coach or create EVENT sessions
      if (session.user.role === "COACH" && key === "coachId") continue;
      if (session.user.role === "COACH" && key === "type" && body.type === "EVENT") continue;
      data[key] = key === "date" ? new Date(body[key]) : body[key];
    }
  }

  const updated = await db.session.update({ where: { id }, data });
  return NextResponse.json(updated);
}
