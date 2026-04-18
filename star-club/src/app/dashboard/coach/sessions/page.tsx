import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDictionary } from "@/lib/dict";
import { Users } from "lucide-react";
import CreateSessionForm from "@/components/coach/create-session-form";
import DeleteSessionButton from "@/components/coach/delete-session-button";
import EditSessionButton from "@/components/coach/edit-session-button";

export default async function CoachSessionsPage() {
  const userSession = await auth();
  if (!userSession?.user || userSession.user.role !== "COACH") redirect("/login");
  const clubId = (userSession.user as { clubId?: string }).clubId ?? "club-star";

  const [sessions, categories] = await Promise.all([
    db.session.findMany({
      where: { coachId: userSession.user.id },
      orderBy: { date: "desc" },
      include: { category: true, _count: { select: { attendances: true } } },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
  ]);

  const dict = await getDictionary();

  type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";
  const typeLabel: Record<string, string> = { TRAINING: "Entrenamiento", MATCH: "Partido", EVENT: "Evento" };
  const typeVariant: Record<string, BadgeVariant> = { TRAINING: "default", MATCH: "warning", EVENT: "success" };

  return (
    <div>
      <Header title={dict.coach?.mySessions ?? "Mis sesiones"} subtitle={`${sessions.length} sesión${sessions.length !== 1 ? "es" : ""}`} />

      <div className="p-8 space-y-6">
        {/* Create session inline card */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Nueva sesión</h3>
          <CreateSessionForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} userRole="COACH" />
        </Card>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <p style={{ color: "var(--text-muted)" }}>Aún no tienes sesiones. ¡Crea la primera arriba!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="p-0 overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{s.title}</h3>
                      <Badge variant={typeVariant[s.type] ?? "default"} >{typeLabel[s.type] ?? s.type}</Badge>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(s.date), "EEEE dd MMM yyyy · HH:mm", { locale: es })}
                      {s.category && ` · ${s.category.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <Users size={13} style={{ color: "var(--accent)" }} />
                        {s._count.attendances}
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>asist.</p>
                    </div>
                    <Link
                      href={`/dashboard/coach/attendance/${s.id}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      Pasar lista
                    </Link>
                    <EditSessionButton
                      session={{ id: s.id, title: s.title, type: s.type, date: s.date.toISOString(), notes: s.notes, categoryId: s.categoryId, coachId: s.coachId }}
                      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                      userRole="COACH"
                    />
                    <DeleteSessionButton sessionId={s.id} sessionTitle={s.title} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

