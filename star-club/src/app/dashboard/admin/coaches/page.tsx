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
      <div className="p-8 space-y-6">

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
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <Avatar name={coach.name} src={coach.avatar ?? undefined} size="md" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{coach.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{coach.email}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                      {coach.branch && (
                        <div className="flex gap-1 flex-wrap">
                          {coach.branch.split(",").map((b) => b.trim()).filter(Boolean).map((b) => (
                            <Badge key={b} variant={branchBadge[b] ?? "default"}>{b}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-center">
                        <div className="flex items-center gap-1 font-medium">
                          <CalendarDays size={13} style={{ color: "var(--accent)" }} />
                          <span>{sessions}</span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sesiones</p>
                      </div>
                      <div className="text-center hidden lg:block">
                        <p className="font-medium">{format(new Date(coach.createdAt), "dd MMM yyyy", { locale: es })}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ingresó</p>
                      </div>
                    </div>

                    {coach.phone && (
                      <a
                        href={`https://wa.me/${coach.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2 py-1 rounded-xl font-medium hidden xl:flex items-center gap-1 transition-all hover:opacity-80 flex-shrink-0"
                        style={{ background: "rgba(37,211,102,0.12)", color: "#25D366" }}
                      >
                        📱 WhatsApp
                      </a>
                    )}
                    <CoachCategorySelect
                      coachId={coach.id}
                      coachCategoryIds={coach.coachCategoryIds ?? "[]"}
                      categories={categories}
                    />
                    <div className="flex items-center gap-1 ml-2">
                      <CoachEditButton coach={{ id: coach.id, name: coach.name, email: coach.email, phone: coach.phone, branch: coach.branch }} />
                      <CoachResetPasswordButton coachId={coach.id} coachName={coach.name} />
                      <CoachDeleteButton coachId={coach.id} coachName={coach.name} />
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
