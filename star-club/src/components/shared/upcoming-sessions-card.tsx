import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  /** Filter sessions by category. null/undefined = show all upcoming sessions */
  categoryId?: string | null;
  /** Max number of sessions to show */
  limit?: number;
}

const TYPE_LABELS: Record<string, string> = {
  TRAINING: "Entrenamiento",
  MATCH:    "Partido",
  EVENT:    "Evento",
};

const TYPE_COLORS: Record<string, string> = {
  TRAINING: "var(--accent)",
  MATCH:    "var(--warning)",
  EVENT:    "var(--info, #38bdf8)",
};

export async function UpcomingSessionsCard({ categoryId, limit = 5 }: Props) {
  const now = new Date();

  const sessions = await db.session.findMany({
    where: {
      date: { gte: now },
      // Show sessions assigned to this specific category OR sessions with no category (= applies to all)
      ...(categoryId
        ? { OR: [{ categoryId }, { categoryId: null }] }
        : {}),
    },
    orderBy: { date: "asc" },
    take: limit,
    include: {
      coach: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Próximos entrenos y partidos</h2>
        <CalendarDays size={18} style={{ color: "var(--accent)" }} />
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
          No hay sesiones próximas programadas.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const typeColor = TYPE_COLORS[s.type] ?? "var(--text-muted)";
            const typeLabel = TYPE_LABELS[s.type] ?? s.type;
            const dateStr  = format(new Date(s.date), "EEEE dd 'de' MMMM · HH:mm", { locale: es });

            return (
              <div
                key={s.id}
                className="flex items-start gap-3 py-3 px-4 rounded-xl"
                style={{ background: "var(--bg-elevated)" }}
              >
                {/* Color-coded left bar */}
                <div
                  className="mt-1 flex-shrink-0 rounded-full"
                  style={{ width: 8, height: 8, background: typeColor, marginTop: 6 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{s.title}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${typeColor}22`, color: typeColor }}
                    >
                      {typeLabel}
                    </span>
                    {s.category && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}
                      >
                        {s.category.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 capitalize" style={{ color: "var(--text-muted)" }}>
                    {dateStr}
                  </p>
                  {s.coach && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Entrenador: {s.coach.name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
