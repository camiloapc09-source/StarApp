import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import AttendanceForm from "@/components/coach/attendance-form";
import { getDictionary } from "@/lib/dict";
import { format } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";

type PlayerWithUser = Prisma.PlayerGetPayload<{ include: { user: true } }>;

export default async function SessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const userSession = await auth();
  if (!userSession?.user || !["ADMIN", "COACH"].includes(userSession.user.role)) redirect("/");
  const clubId = (userSession.user as { clubId?: string }).clubId ?? "club-star";

  const { id } = await params;
  const sess = await db.session.findFirst({
    where: { id, clubId },
    include: { category: true, attendances: { include: { player: { include: { user: true } } } } },
  });

  if (!sess) return redirect("/dashboard/coach/sessions");

  if (userSession.user.role === "COACH" && sess.coachId !== userSession.user.id) redirect("/dashboard/coach");

  // Build player filter: category + zone (sede) when available
  let players: PlayerWithUser[] = await db.player.findMany({
    where: {
      clubId,
      status: "ACTIVE",
      ...(sess.categoryId ? { categoryId: sess.categoryId } : {}),
      ...(sess.location   ? { zone: sess.location }          : {}),
    },
    include: { user: true },
  });

  // If zone+category combo returns nothing, relax to category only
  if (players.length === 0 && sess.location && sess.categoryId) {
    players = await db.player.findMany({
      where: { clubId, status: "ACTIVE", categoryId: sess.categoryId },
      include: { user: true },
    });
  }

  // Last resort: zone only (no category on session)
  if (players.length === 0 && sess.location) {
    players = await db.player.findMany({
      where: { clubId, status: "ACTIVE", zone: sess.location },
      include: { user: true },
    });
  }

  // Absolute fallback: all active players (session has neither category nor zone)
  if (players.length === 0 && !sess.categoryId && !sess.location) {
    players = await db.player.findMany({ where: { clubId, status: "ACTIVE" }, include: { user: true }, take: 100 });
  }

  const initialAttendances = (sess.attendances || []).map((a) => ({ playerId: a.playerId, status: a.status }));
  const dict = await getDictionary();

  return (
    <div>
      <Header title={dict.attendance?.takeAttendance ?? "Take attendance"} subtitle={`${sess.title} · ${format(new Date(sess.date), "PPP p")}`} />

      <div className="p-4 md:p-8">
        <AttendanceForm sessionId={sess.id} players={players} initialAttendances={initialAttendances} t={dict} />
      </div>
    </div>
  );
}
