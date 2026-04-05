import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  ageMin: z.number().int().min(0).max(99),
  ageMax: z.number().int().min(0).max(99),
});

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const category = await db.category.create({ data: parsed.data });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Una categoría con ese nombre ya existe" }, { status: 409 });
  }
}
