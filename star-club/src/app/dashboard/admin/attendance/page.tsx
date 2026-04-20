import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getDictionary } from "@/lib/dict";

export default async function AdminAttendancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const sessions = await db.session.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
    take: 20,
    include: {
      category: true,
      coach: { select: { name: true } },
      attendances: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
    },
  });

  const dict = await getDictionary();

  return (
    <div>
      <Header title={dict.common?.attendance ?? "Attendance"} subtitle={dict.attendance?.subtitle ?? "Session history and attendance records"} />
      <div className="p-4 md:p-8 space-y-6">
        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <p style={{ color: "var(--text-muted)" }}>{dict.attendance?.noSessions ?? "No sessions recorded yet."}</p>
          </Card>
        ) : (
          sessions.map((s) => {
            const presentCount = s.attendances.filter((a) => a.status === "PRESENT").length;
            const total = s.attendances.length;
            const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

            return (
              <Card key={s.id} className="p-0 overflow-hidden">
                <div
                  className="px-4 py-4 border-b space-y-3"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  {/* Top row: date + title + rate + badge */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <span className="text-sm font-bold leading-none">{format(new Date(s.date), "dd")}</span>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{format(new Date(s.date), "MMM")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">{s.title}</h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {s.category?.name || "Todas"} · {s.coach?.name || "Sin asignar"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-base">{rate}%</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{presentCount}/{total}</p>
                    </div>
                    <Badge variant={s.type === "MATCH" ? "warning" : s.type === "EVENT" ? "info" : "default"} >
                      {s.type}
                    </Badge>
                  </div>
                  {/* Full-width button below */}
                  <Link
                    href={`/dashboard/admin/attendance/${s.id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.25)" }}
                  >
                    <ClipboardList size={13} />
                    Tomar asistencia
                  </Link>
                </div>

                {s.attendances.length > 0 && (
                  <div className="px-6 py-3 flex flex-wrap gap-2">
                    {s.attendances.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--border-primary)",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              att.status === "PRESENT"
                                ? "var(--success)"
                                : att.status === "LATE"
                                ? "var(--warning)"
                                : att.status === "EXCUSED"
                                ? "var(--info)"
                                : "var(--error)",
                          }}
                        />
                        <span>{att.player.user.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
