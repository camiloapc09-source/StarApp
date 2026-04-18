import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import AttendanceForm from "@/components/coach/attendance-form";
import { getDictionary } from "@/lib/dict";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type PlayerWithUser = Prisma.PlayerGetPayload<{ include: { user: true } }>;

export default async function AdminSessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const userSession = await auth();
  if (!userSession?.user || userSession.user.role !== "ADMIN") redirect("/login");
  const clubId = (userSession.user as { clubId?: string }).clubId ?? "club-star";

  const { id } = await params;

  const sess = await db.session.findFirst({
    where: { id, clubId },
    include: {
      category: true,
      coach: { select: { name: true } },
      attendances: { include: { player: { include: { user: true } } } },
    },
  });

  if (!sess) redirect("/dashboard/admin/attendance");

  let players: PlayerWithUser[] = [];
  if (sess.categoryId) {
    players = await db.player.findMany({
      where: { clubId, categoryId: sess.categoryId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
  }
  if (!players || players.length === 0) {
    players = await db.player.findMany({
      where: { clubId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      take: 100,
    });
  }

  const initialAttendances = sess.attendances.map((a) => ({ playerId: a.playerId, status: a.status }));
  const dict = await getDictionary();

  const dateStr = format(new Date(sess.date), "EEEE dd MMM yyyy · HH:mm", { locale: es });

  return (
    <div>
      <Header
        title="Tomar asistencia"
        subtitle={`${sess.title} · ${dateStr}`}
      />
      <div className="p-8 space-y-4">
        <Link
          href="/dashboard/admin/attendance"
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} /> Volver a Asistencia
        </Link>

        <div className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
          {sess.category ? `Categoría: ${sess.category.name}` : "Todas las categorías"}
          {sess.coach ? ` · Entrenador: ${sess.coach.name}` : ""}
          {" · "}{players.length} deportistas
        </div>

        <AttendanceForm
          sessionId={sess.id}
          players={players}
          initialAttendances={initialAttendances}
          t={dict}
        />
      </div>
    </div>
  );
}
