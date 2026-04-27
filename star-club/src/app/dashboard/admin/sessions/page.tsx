import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Users } from "lucide-react";
import DeleteSessionButton from "@/components/coach/delete-session-button";
import CreateSessionForm from "@/components/coach/create-session-form";
import EditSessionButton from "@/components/coach/edit-session-button";
import RecurringSessionForm from "@/components/coach/recurring-session-form";

export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [sessions, categories, coaches, club] = await Promise.all([
    db.session.findMany({
      where: { clubId },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        category: true,
        _count: { select: { attendances: true } },
        coach: { select: { name: true } },
      },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "COACH", clubId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.club.findUnique({ where: { id: clubId }, select: { zonePrices: true } }),
  ]);

  const locations = club?.zonePrices
    ? Object.keys(club.zonePrices as Record<string, unknown>)
    : [];

  const typeLabel: Record<string, string> = { TRAINING: "Entrenamiento", MATCH: "Partido", EVENT: "Evento" };
  type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";
  const typeVariant: Record<string, BadgeVariant> = { TRAINING: "default", MATCH: "warning", EVENT: "success" };

  const totalAttendances = sessions.reduce((sum, s) => sum + s._count.attendances, 0);

  return (
    <div>
      <Header title="Sesiones" subtitle={`${sessions.length} sesiones · ${totalAttendances} asistencias`} />
      <div className="p-4 md:p-8 space-y-6">

        {/* Create session form */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Nueva sesión / partido / evento</h3>
          <CreateSessionForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            coaches={coaches}
            userRole="ADMIN"
            locations={locations}
          />
        </Card>

        {/* Recurring sessions */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Sesiones recurrentes</h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Crea múltiples sesiones automáticamente para las próximas semanas.
          </p>
          <RecurringSessionForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            coaches={coaches}
            userRole="ADMIN"
            locations={locations}
          />
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["TRAINING", "MATCH", "EVENT"] as const).map((t) => {
            const count = sessions.filter((s) => s.type === t).length;
            return (
              <Card key={t} className="px-4 py-3 text-center">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{typeLabel[t]}</div>
              </Card>
            );
          })}          <Card className="px-4 py-3 text-center">
            <div className="text-xl font-bold">{totalAttendances}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Asistencias</div>
          </Card>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CalendarDays size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>No hay sesiones registradas aun.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="p-0 overflow-hidden">
                <div className="px-4 py-4">
                  {/* Top: title + attendance count + edit/delete */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{s.title}</h3>
                        <Badge variant={typeVariant[s.type] ?? "default"}>{typeLabel[s.type] ?? s.type}</Badge>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(s.date), "EE dd MMM yyyy · HH:mm", { locale: es })}
                        {s.category && ` · ${s.category.name}`}
                        {s.location && ` · ${s.location}`}
                        {s.coach && ` · ${s.coach.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <Users size={13} style={{ color: "var(--accent)" }} />
                        {s._count.attendances}
                      </div>
                      <EditSessionButton
                        session={{ id: s.id, title: s.title, type: s.type, date: s.date.toISOString(), notes: s.notes, categoryId: s.categoryId, coachId: s.coachId, location: s.location }}
                        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                        coaches={coaches}
                        userRole="ADMIN"
                        locations={locations}
                      />
                      <DeleteSessionButton sessionId={s.id} sessionTitle={s.title} />
                    </div>
                  </div>
                  {/* Bottom: full-width attendance button */}
                  <Link
                    href={`/dashboard/admin/attendance/${s.id}`}
                    className="mt-3 flex items-center justify-center w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.25)" }}
                  >
                    Tomar asistencia
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
