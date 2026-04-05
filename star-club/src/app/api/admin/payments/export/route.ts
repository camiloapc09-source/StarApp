import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url    = new URL(req.url);
  const status = url.searchParams.get("status"); // optional filter

  const payments = await db.payment.findMany({
    where: status ? { status } : undefined,
    orderBy: { dueDate: "asc" },
    include: {
      player: {
        include: {
          user: { select: { name: true, phone: true } },
          parentLinks: {
            include: { parent: { include: { user: { select: { name: true, phone: true } } } } },
            take: 1,
          },
          category: { select: { name: true } },
        },
      },
    },
  });

  const STATUS_NAMES: Record<string, string> = {
    PENDING:   "Pendiente",
    OVERDUE:   "Vencido",
    SUBMITTED: "En revisión",
    COMPLETED: "Pagado",
  };

  const rows = payments.map((p, i) => {
    const parent = p.player.parentLinks[0]?.parent;
    return {
      "#":             i + 1,
      "Deportista":    p.player.user.name,
      "Categoría":     p.player.category?.name ?? "",
      "Concepto":      p.concept,
      "Monto":         p.amount,
      "Vencimiento":   new Date(p.dueDate).toLocaleDateString("es-CO"),
      "Estado":        STATUS_NAMES[p.status] ?? p.status,
      "Fecha de pago": p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-CO") : "",
      "Método":        p.paymentMethod ?? "",
      "Padre/Tutor":   parent?.user?.name ?? "",
      "Tel. tutor":    parent?.user?.phone ?? "",
    };
  });

  const wb  = XLSX.utils.book_new();
  const ws  = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 4 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Pagos");

  const buffer   = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `pagos-star-club-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
