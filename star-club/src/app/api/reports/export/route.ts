import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import { calculateLevel } from "@/lib/utils";
import { requireAdmin, getClubId, isResponse, apiError } from "@/lib/api";

/** Edad en años cumplidos a partir de la fecha de nacimiento. */
function ageFromDOB(dob: Date | null | undefined): number | "" {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : "";
}

const GENDER_NAMES: Record<string, string> = { M: "Masculino", F: "Femenino" };
const STATUS_NAMES: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  INACTIVE: "Inactivo",
};

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Neutralize formula injection: prefix with space and wrap in double quotes
  if (/^[=+\-@\t\r]/.test(str)) return `"' ${str.replace(/"/g, '""')}"`;
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
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
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { getLimits } = await import("@/lib/plans");
  const club = await db.club.findUnique({ where: { id: clubId }, select: { plan: true } });
  if (!getLimits(club?.plan ?? "STARTER").exportExcel) {
    return apiError("Exportar datos requiere el plan PRO.", 403);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "players";

  let csv = "";
  let filename = "";

  if (type === "players") {
    const players = await db.player.findMany({
      where: { clubId },
      include: {
        user: { select: { name: true, email: true, phone: true, emergencyContact: true, eps: true, documentNumber: true } },
        category: { select: { name: true, ageMin: true } },
        parentLinks: {
          include: { parent: { select: { phone: true, user: { select: { name: true, email: true } } } } },
          take: 1,
        },
      },
    });

    // Organizar por categoría (por rango de edad) y, dentro de cada una, por edad.
    const sorted = players.sort((a, b) => {
      const catA = a.category?.ageMin ?? 999;
      const catB = b.category?.ageMin ?? 999;
      if (catA !== catB) return catA - catB;
      const nameA = a.category?.name ?? "";
      const nameB = b.category?.name ?? "";
      if (nameA !== nameB) return nameA.localeCompare(nameB, "es");
      const ageA = ageFromDOB(a.dateOfBirth);
      const ageB = ageFromDOB(b.dateOfBirth);
      if (ageA !== ageB) return (ageA === "" ? 999 : ageA) - (ageB === "" ? 999 : ageB);
      return a.user.name.localeCompare(b.user.name, "es");
    });

    const rows = sorted.map((p, i) => {
      const parent = p.parentLinks[0]?.parent;
      return {
        "#": i + 1,
        "Categoría": p.category?.name ?? "Sin categoría",
        "Nombre": p.user.name,
        "Documento": p.documentNumber ?? p.user.documentNumber ?? "",
        "Fecha nacimiento": p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("es-CO") : "",
        "Edad": ageFromDOB(p.dateOfBirth),
        "Género": GENDER_NAMES[p.gender ?? ""] ?? "",
        "Posición": p.position ?? "",
        "Dorsal": p.jerseyNumber ?? "",
        "Estatura (cm)": p.height ?? "",
        "Peso (kg)": p.weight ?? "",
        "Estado": STATUS_NAMES[p.status] ?? p.status,
        "Zona": p.zone ?? "",
        "Fecha de ingreso": p.joinDate ? new Date(p.joinDate).toLocaleDateString("es-CO") : "",
        "Día de pago": p.paymentDay ?? "",
        "Mensualidad": p.monthlyAmount ?? "",
        "Beca %": p.scholarshipPct ?? "",
        "Teléfono": p.phone ?? p.user.phone ?? "",
        "Dirección": p.address ?? "",
        "Email": p.user.email,
        "Contacto emergencia": p.user.emergencyContact ?? "",
        "EPS": p.user.eps ?? "",
        "Tutor / Acudiente": parent?.user.name ?? "",
        "Tel. tutor": parent?.phone ?? "",
        "Email tutor": parent?.user.email ?? "",
        "XP": p.xp,
        "Nivel": calculateLevel(p.xp),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 },  { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 15 }, { wch: 6 },
      { wch: 11 }, { wch: 14 }, { wch: 7 },  { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 9 },  { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 8 },  { wch: 14 },
      { wch: 24 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
      { wch: 26 }, { wch: 8 },  { wch: 7 },
    ];
    if (rows.length > 0) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 26 } }) };
    XLSX.utils.book_append_sheet(wb, ws, "Deportistas");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    filename = `deportistas_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } else if (type === "payments") {
    const payments = await db.payment.findMany({
      where: { clubId },
      orderBy: { dueDate: "desc" },
      take: 1000,
      select: {
        concept: true, amount: true, status: true, dueDate: true,
        paymentMethod: true, createdAt: true,
        player: { select: { user: { select: { name: true } } } },
      },
    });

    const headers = ["Jugador", "Concepto", "Monto", "Estado", "Vencimiento", "Método de pago", "Fecha creación"];
    const rows = payments.map((p) => [
      p.player?.user.name ?? "", p.concept, p.amount, p.status,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString("es-CO") : "",
      p.paymentMethod ?? "",
      p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-CO") : "",
    ]);

    csv = toCSV(headers, rows);
    filename = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;

  } else {
    return apiError("type must be players or payments", 400);
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
