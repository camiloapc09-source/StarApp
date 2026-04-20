import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import NewInviteForm from "@/components/admin/new-invite-form";
import { CoachEditButton, CoachDeleteButton, CoachResetPasswordButton } from "@/components/admin/coach-actions";
import { CoachCategorySelect } from "@/components/admin/coach-category-select";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = { searchParams: Promise<{ branch?: string }> };

// Branches are fetched dynamically from DB per club

export default async function AdminCoachesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const { branch: selectedBranch } = await searchParams;
  const dict = await getDictionary();

  // Get all coaches, categories, session counts, and distinct branches in parallel
  const [coaches, categories, sessionCounts, allCoachBranches] = await Promise.all([
    db.user.findMany({
      where: {
        role: "COACH",
        clubId,
        ...(selectedBranch ? { branch: selectedBranch } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { coachSessions: true } },
      },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
    db.session.groupBy({
      by: ["coachId"],
      _count: { _all: true },
      where: { clubId, coachId: { not: null } },
    }),
    db.user.findMany({ where: { role: "COACH", clubId }, select: { branch: true } }),
  ]);

  // Build sorted list of unique branches from all coaches in this club
  const allBranches = Array.from(
    new Set(
      allCoachBranches
        .flatMap((c) => (c.branch ? c.branch.split(",").map((b) => b.trim()) : []))
        .filter(Boolean)
    )
  ).sort();

  const countMap = Object.fromEntries(
    sessionCounts.filter((s) => s.coachId).map((s) => [s.coachId!, s._count._all])
  );

  type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";
  const branchColors: BadgeVariant[] = ["success", "info", "accent", "warning", "default"];
  const branchBadge: Record<string, BadgeVariant> = Object.fromEntries(
    allBranches.map((b, i) => [b, branchColors[i % branchColors.length]])
  );

  return (
    <div>
      <Header
        title={dict.common?.coaches ?? "Entrenadores"}
        subtitle={`${coaches.length} entrenador${coaches.length !== 1 ? "es" : ""}`}
      />
      <div className="p-4 md:p-8 space-y-6">

        {/* Inline invite code generator */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Generar código de registro</h3>
          <NewInviteForm defaultRole="COACH" hideRoleSelect={true} />
        </Card>

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/admin/coaches">
              <span
                className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer border transition-all"
                style={!selectedBranch
                  ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                  : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
              >
                Todas las sedes
              </span>
            </Link>
            {allBranches.map((branch) => (
              <Link key={branch} href={`/dashboard/admin/coaches?branch=${encodeURIComponent(branch)}`}>
                <span
                  className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer border transition-all"
                  style={selectedBranch === branch
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
                >
                  {branch}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/dashboard/admin/users/new">
            <Button>
              <Plus size={16} />
              Añadir entrenador
            </Button>
          </Link>
        </div>

        {/* Coaches list */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
            <h2 className="font-semibold">
              {selectedBranch ?? "Todos los entrenadores"}
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {coaches.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {selectedBranch
                    ? `No hay entrenadores en ${selectedBranch} aún.`
                    : "No hay entrenadores registrados aún."}
                </p>
                <Link href="/dashboard/admin/users/new">
                  <Button variant="secondary">
                    <Plus size={16} /> Añadir entrenador
                  </Button>
                </Link>
              </div>
            ) : (
              coaches.map((coach) => {
                const sessions = countMap[coach.id] ?? 0;
                return (
                  <div
                    key={coach.id}
                    className="flex gap-3 px-4 py-4 hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <Avatar name={coach.name} src={coach.avatar ?? undefined} size="md" />

                    <div className="flex-1 min-w-0">
                      {/* Top row: name + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{coach.name}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{coach.email}</p>
                          {/* Desktop-only extra info */}
                          <div className="hidden md:flex items-center gap-4 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                            {coach.branch && coach.branch.split(",").map((b) => b.trim()).filter(Boolean).map((b) => (
                              <Badge key={b} variant={branchBadge[b] ?? "default"}>{b}</Badge>
                            ))}
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} style={{ color: "var(--accent)" }} />{sessions} sesiones
                            </span>
                            {coach.phone && (
                              <a href={`https://wa.me/${coach.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                                className="font-medium" style={{ color: "#25D366" }}>📱 WhatsApp</a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <CoachEditButton coach={{ id: coach.id, name: coach.name, email: coach.email, phone: coach.phone, branch: coach.branch }} />
                          <CoachResetPasswordButton coachId={coach.id} coachName={coach.name} />
                          <CoachDeleteButton coachId={coach.id} coachName={coach.name} />
                        </div>
                      </div>
                      {/* Category select below name — full width on mobile */}
                      <div className="mt-2">
                        <CoachCategorySelect
                          coachId={coach.id}
                          coachCategoryIds={coach.coachCategoryIds ?? "[]"}
                          categories={categories}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
