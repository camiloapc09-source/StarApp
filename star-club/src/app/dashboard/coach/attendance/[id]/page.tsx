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
  if (!userSession?.user || !["ADMIN", "COACH"].includes(userSession.user.role)) redirect("/login");

  const { id } = await params;
  const sess = await db.session.findUnique({
    where: { id },
    include: { category: true, attendances: { include: { player: { include: { user: true } } } } },
  });

  if (!sess) return redirect("/dashboard/coach/sessions");

  if (userSession.user.role === "COACH" && sess.coachId !== userSession.user.id) redirect("/dashboard/coach");

  let players: PlayerWithUser[] = [];
  if (sess.categoryId) {
    players = await db.player.findMany({ where: { categoryId: sess.categoryId, status: "ACTIVE" }, include: { user: true } });
  }
  if (!players || players.length === 0) {
    players = await db.player.findMany({ where: { status: "ACTIVE" }, include: { user: true }, take: 100 });
  }

  const initialAttendances = (sess.attendances || []).map((a) => ({ playerId: a.playerId, status: a.status }));
  const dict = await getDictionary();

  return (
    <div>
      <Header title={dict.attendance?.takeAttendance ?? "Take attendance"} subtitle={`${sess.title} · ${format(new Date(sess.date), "PPP p")}`} />

      <div className="p-8">
        <AttendanceForm sessionId={sess.id} players={players} initialAttendances={initialAttendances} t={dict} />
      </div>
    </div>
  );
}
