import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";

  if (type === "overview") {
    const [totalPlayers, activePlayersThisMonth, totalRevenue, pendingRevenue, avgAttendance] =
      await Promise.all([
        db.player.count({ where: { clubId, status: "ACTIVE" } }),
        db.player.count({
          where: {
            clubId,
            status: "ACTIVE",
            lastActive: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        db.payment.aggregate({ where: { clubId, status: "COMPLETED" }, _sum: { amount: true } }),
        db.payment.aggregate({ where: { clubId, status: "PENDING" }, _sum: { amount: true } }),
        db.attendance.groupBy({
          by: ["status"],
          _count: true,
          where: { session: { clubId } },
        }),
      ]);

    const presentCount = avgAttendance.find((a) => a.status === "PRESENT")?._count || 0;
    const totalAttendance = avgAttendance.reduce((s, a) => s + a._count, 0);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    return apiOk({
      totalPlayers,
      activePlayersThisMonth,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingRevenue: pendingRevenue._sum.amount || 0,
      attendanceRate,
    });
  }

  if (type === "top-players") {
    const topPlayers = await db.player.findMany({
      where: { clubId },
      orderBy: { xp: "desc" },
      take: 10,
      include: { user: { select: { name: true, avatar: true } }, category: true },
    });
    return apiOk(topPlayers);
  }

  if (type === "payments") {
    const payments = await db.payment.groupBy({
      by: ["status"],
      where: { clubId },
      _count: true,
      _sum: { amount: true },
    });
    return apiOk(payments);
  }

  return apiError("Unknown report type", 400);
}
