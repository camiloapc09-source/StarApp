import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";

  if (type === "overview") {
    const [
      totalPlayers,
      activePlayersThisMonth,
      totalRevenue,
      pendingRevenue,
      avgAttendance,
    ] = await Promise.all([
      db.player.count({ where: { status: "ACTIVE" } }),
      db.player.count({
        where: {
          status: "ACTIVE",
          lastActive: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
      db.attendance.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const presentCount =
      avgAttendance.find((a) => a.status === "PRESENT")?._count || 0;
    const totalAttendance = avgAttendance.reduce((s, a) => s + a._count, 0);
    const attendanceRate =
      totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    return NextResponse.json({
      totalPlayers,
      activePlayersThisMonth,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingRevenue: pendingRevenue._sum.amount || 0,
      attendanceRate,
    });
  }

  if (type === "top-players") {
    const topPlayers = await db.player.findMany({
      orderBy: { xp: "desc" },
      take: 10,
      include: { user: { select: { name: true, avatar: true } }, category: true },
    });
    return NextResponse.json(topPlayers);
  }

  if (type === "payments") {
    const payments = await db.payment.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amount: true },
    });
    return NextResponse.json(payments);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
