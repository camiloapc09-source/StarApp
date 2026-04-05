import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Prefix with apostrophe to prevent formula injection
  if (/^[=+\-@\t\r]/.test(str)) return `'${str.replace(/"/g, '""')}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const header = headers.map(escapeCSV).join(",");
  const body = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
  return `${header}\n${body}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "players";

  let csv = "";
  let filename = "";

  if (type === "players") {
    const players = await db.player.findMany({
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { name: true } },
        parentLinks: {
          include: { parent: { select: { phone: true, user: { select: { name: true, email: true } } } } },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const headers = ["Nombre", "Email", "Categoría", "Estado", "XP", "Día de pago", "Tutor", "Teléfono tutor", "Fecha registro"];
    const rows = players.map((p) => {
      const parent = p.parentLinks[0]?.parent;
      return [
        p.user.name,
        p.user.email,
        p.category?.name ?? "",
        p.status,
        p.xp,
        p.paymentDay ?? "",
        parent?.user.name ?? "",
        parent?.phone ?? "",
        p.joinDate ? new Date(p.joinDate).toLocaleDateString("es-CO") : "",
      ];
    });

    csv = toCSV(headers, rows);
    filename = `jugadores_${new Date().toISOString().slice(0, 10)}.csv`;

  } else if (type === "payments") {
    const payments = await db.payment.findMany({
      orderBy: { dueDate: "desc" },
      take: 1000,
      select: {
        id: true,
        concept: true,
        amount: true,
        status: true,
        dueDate: true,
        paymentMethod: true,
        createdAt: true,
        player: { select: { user: { select: { name: true } } } },
      },
    });

    const headers = ["Jugador", "Concepto", "Monto", "Estado", "Vencimiento", "Método de pago", "Fecha creación"];
    const rows = payments.map((p) => [
      p.player?.user.name ?? "",
      p.concept,
      p.amount,
      p.status,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString("es-CO") : "",
      p.paymentMethod ?? "",
      p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-CO") : "",
    ]);

    csv = toCSV(headers, rows);
    filename = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;

  } else {
    return NextResponse.json({ error: "type must be players or payments" }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
