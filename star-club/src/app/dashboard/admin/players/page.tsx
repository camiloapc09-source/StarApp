import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Plus, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { calculateLevel } from "@/lib/utils";
import NewInviteForm from "@/components/admin/new-invite-form";
import AvatarReviewList from "@/components/admin/avatar-review-list";

type Props = { searchParams: Promise<{ categoryId?: string; gender?: string; zone?: string }> };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { categoryId: selectedCategory, gender: selectedGender, zone: selectedZone } = await searchParams;
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const t = await getDictionary();

  // Determine upfront whether this club uses gender segmentation
  const genderedCount = await db.player.count({ where: { clubId, gender: { not: null } } });
  const clubHasGenderedPlayers = genderedCount > 0;

  const playerWhere: Record<string, unknown> = selectedCategory
    ? { clubId, categoryId: selectedCategory }
    : { clubId };
  if (clubHasGenderedPlayers && (selectedGender === "F" || selectedGender === "M")) playerWhere.gender = selectedGender;
  if (selectedZone) playerWhere.zone = selectedZone;

  const [players, categories, pendingAvatars, club] = await Promise.all([
    db.player.findMany({
      where: playerWhere,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        category: true,
        attendances: { select: { status: true } },
      },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { clubId, avatarStatus: "PENDING", avatarPending: { not: null } },
      select: { id: true, name: true, avatarPending: true },
    }),
    db.club.findUnique({ where: { id: clubId }, select: { zonePrices: true, name: true } }),
  ]);

  const zones = club?.zonePrices ? Object.keys(club.zonePrices as Record<string, unknown>) : [];
  const clubName = club?.name ?? "el club";
  const pendingPlayers = players.filter((p) => p.status === "PENDING");

  function buildHref(opts: { categoryId?: string; gender?: string; zone?: string }) {
    const p = new URLSearchParams();
    if (opts.categoryId) p.set("categoryId", opts.categoryId);
    if (opts.gender) p.set("gender", opts.gender);
    if (opts.zone) p.set("zone", opts.zone);
    const q = p.toString();
    return `/dashboard/admin/players${q ? `?${q}` : ""}`;
  }

  return (
    <div>
      <Header title={t.common.players} subtitle={`${players.length} ${t.common.players}`} />
      <div className="p-4 md:p-8 space-y-6">

        {/* Inline invite code generator */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Generar código de registro</h3>
          <NewInviteForm defaultRole="PLAYER" hideRoleSelect={true} />
        </Card>

        {/* Pending avatar approvals */}
        {pendingAvatars.length > 0 && (
          <Card className="p-5">
            <AvatarReviewList
              pending={pendingAvatars.map((u) => ({
                userId: u.id,
                name: u.name,
                avatarPending: u.avatarPending!,
              }))}
            />
          </Card>
        )}

        {/* Pending player approvals */}
        {pendingPlayers.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} style={{ color: "var(--warning)" }} />
              <h3 className="text-sm font-semibold">Deportistas pendientes de activación ({pendingPlayers.length})</h3>
            </div>
            <div className="space-y-3">
              {pendingPlayers.map((p) => {
                const phone = p.phone || p.user.phone;
                const digits = phone?.replace(/[^0-9]/g, "");
                const waMsg = encodeURIComponent(
                  `Hola, te escribimos desde *${clubName}* 🏆\n\nQueremos recordarte que la inscripción de *${p.user.name}* está pendiente de pago para poder activar su cuenta en la plataforma.\n\n¡Quedamos atentos! 😊`
                );
                const waHref = digits ? `https://wa.me/${digits}?text=${waMsg}` : null;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,184,0,0.05)", border: "1px solid rgba(255,184,0,0.15)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)" }}>
                        {p.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{p.user.name}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{p.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {waHref && (
                        <a href={waHref} target="_blank" rel="noreferrer"
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all hover:opacity-80"
                          style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
                          💬 Recordar
                        </a>
                      )}
                      <Link href={`/dashboard/admin/players/${p.id}`} className="relative z-10">
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all hover:opacity-80"
                          style={{ background: "var(--accent)", color: "#000" }}>
                          Activar →
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Category chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={buildHref({ gender: selectedGender, zone: selectedZone })}>
                <span
                  className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer border transition-all"
                  style={!selectedCategory
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
                >
                  Todos
                </span>
              </Link>
              {categories.map((cat) => (
                <Link key={cat.id} href={buildHref({ categoryId: cat.id, gender: selectedGender, zone: selectedZone })}>
                  <span
                    className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer border transition-all"
                    style={selectedCategory === cat.id
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                      : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
                  >
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/dashboard/admin/players/new">
              <Button>
                <Plus size={16} />
                {t.common.addPlayer}
              </Button>
            </Link>
          </div>

          {/* Sede/zone chips — visible when club has zones */}
          {zones.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Link href={buildHref({ categoryId: selectedCategory, gender: selectedGender })}>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={!selectedZone
                    ? { background: "rgba(52,211,153,0.20)", color: "#6EE7B7", border: "1px solid rgba(52,211,153,0.35)" }
                    : { color: "rgba(255,255,255,0.40)", border: "1px solid transparent" }}>
                  Todas las sedes
                </span>
              </Link>
              {zones.map((z) => (
                <Link key={z} href={buildHref({ categoryId: selectedCategory, gender: selectedGender, zone: z })}>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    style={selectedZone === z
                      ? { background: "rgba(52,211,153,0.20)", color: "#6EE7B7", border: "1px solid rgba(52,211,153,0.35)" }
                      : { color: "rgba(255,255,255,0.40)", border: "1px solid transparent" }}>
                    {z}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Gender tabs — visible only for clubs that use gender segmentation */}
          {selectedCategory && clubHasGenderedPlayers && (
            <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {[
                { label: "Todos", value: undefined },
                { label: "♀ Femenino", value: "F" },
                { label: "♂ Masculino", value: "M" },
              ].map(({ label, value }) => {
                const isActive = (value === undefined && !selectedGender) || selectedGender === value;
                return (
                  <Link key={label} href={buildHref({ categoryId: selectedCategory, gender: value, zone: selectedZone })}>
                    <span
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      style={isActive
                        ? { background: "rgba(139,92,246,0.25)", color: "#DEC4FF", border: "1px solid rgba(139,92,246,0.40)" }
                        : { color: "rgba(255,255,255,0.40)", border: "1px solid transparent" }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Players Table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
            <h2 className="font-semibold">{t.common.allPlayers}</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {players.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {t.common.noPlayersYet}
                </p>
                <Link href="/dashboard/admin/players/new">
                  <Button variant="secondary">
                    <Plus size={16} /> {t.common.addFirstPlayer}
                  </Button>
                </Link>
              </div>
            ) : (
              players.map((player) => {
                const level = calculateLevel(player.xp);
                const presentCount = player.attendances.filter((a) => a.status === "PRESENT").length;
                const attendancePct =
                  player.attendances.length > 0
                    ? Math.round((presentCount / player.attendances.length) * 100)
                    : 0;

                // Age-category mismatch check
                let ageCategoryWarning = false;
                if (player.dateOfBirth && player.category) {
                  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
                  const { ageMin, ageMax } = player.category;
                  if (typeof ageMax === "number" && age > ageMax) ageCategoryWarning = true;
                  if (typeof ageMin === "number" && age < ageMin) ageCategoryWarning = true;
                }

                return (
                  <div
                    key={player.id}
                    className="relative flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    {/* Full-row navigation link as overlay */}
                    <Link
                      href={`/dashboard/admin/players/${player.id}`}
                      className="absolute inset-0"
                      aria-label={`Ver perfil de ${player.user.name}`}
                    />

                    <Avatar name={player.user.name} src={player.user.avatar} size="md" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{player.user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {player.user.email}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{player.category?.name || "-"}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.common.category}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">#{player.jerseyNumber || "-"}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.common.jersey}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 font-medium" style={{ color: "var(--accent)" }}>
                          <Zap size={13} />
                          <span>{player.xp}</span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Lv.{level}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{attendancePct}%</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.common.attendanceLabel}</p>
                      </div>
                      {ageCategoryWarning && (
                        <div className="text-center" title={`Edad no coincide con categoría ${player.category?.name}`}>
                          <AlertTriangle size={15} style={{ color: "var(--warning)" }} />
                        </div>
                      )}

                    </div>

                    <Badge variant={player.status === "ACTIVE" ? "success" : player.status === "PENDING" ? "warning" : "default"} className="relative z-10">
                      {(t.common.status as any)?.[player.status] ?? player.status}
                    </Badge>
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
