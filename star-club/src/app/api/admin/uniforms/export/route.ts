import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/admin/uniforms/export  export all orders to Excel
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url    = new URL(req.url);
  const status = url.searchParams.get("status"); // optional filter

  const orders = await db.uniformOrder.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      player: { include: { user: { select: { name: true } } } },
      parent: { include: { user: { select: { name: true } } } },
    },
  });

  const TYPE_NAMES: Record<string, string> = {
    TRAINING:     "Entrenamiento",
    GAME:         "Juego doble faz",
    PRESENTATION: "Presentación",
  };
  const STATUS_NAMES: Record<string, string> = {
    PENDING:   "Pendiente",
    CONFIRMED: "Confirmado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };

  const rows = orders.map((o, i) => ({
    "#":                   i + 1,
    "Deportista":          o.player.user.name,
    "Tipo uniforme":       TYPE_NAMES[o.type] ?? o.type,
    "Nombre en camiseta":  o.nameOnJersey,
    "Número":              o.numberOnJersey ?? "",
    "Talla camiseta":      o.jerseySize,
    "Talla pantaloneta":   o.shortsSize,
    "Precio":              o.totalPrice,
    "Estado":              STATUS_NAMES[o.status] ?? o.status,
    "Padre / Tutor":       o.parent.user.name,
    "Observaciones":       o.notes ?? "",
    "Fecha pedido":        new Date(o.createdAt).toLocaleDateString("es-CO"),
  }));

  const wb  = XLSX.utils.book_new();
  const ws  = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 4 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 8 },
    { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Pedidos uniformes");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `uniformes-star-club-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
