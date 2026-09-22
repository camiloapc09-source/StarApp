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
import PlayerSearch from "@/components/admin/player-search";
import { Suspense } from "react";
import { normalizePhone, whatsappLink } from "@/lib/phone";

type Props = { searchParams: Promise<{ categoryId?: string; gender?: string; zone?: string; q?: string; page?: string }> };

/** Cuántos deportistas se muestran por página. */
const PAGE_SIZE = 40;

export default async function AdminPlayersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { categoryId: selectedCategory, gender: selectedGender, zone: selectedZone, q, page } = await searchParams;
  const query = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page) || 1);
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

  // La búsqueda se hace en la base, no en memoria. Antes se traían TODOS los
  // jugadores con TODAS sus asistencias y se filtraba en JavaScript: con 50
  // alumnos se nota poco, con 500 la página se arrastra.
  if (query) {
    playerWhere.OR = [
      { user: { name: { contains: query, mode: "insensitive" } } },
      { user: { email: { contains: query, mode: "insensitive" } } },
      { documentNumber: { contains: query, mode: "insensitive" } },
      ...(Number.isFinite(Number(query)) && query !== "" ? [{ jerseyNumber: Number(query) }] : []),
    ];
  }

  const [totalCount, players, categories, pendingAvatars, club, pendingPlayers] = await Promise.all([
    db.player.count({ where: playerWhere }),
    db.player.findMany({
      where: playerWhere,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: true, category: true },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { clubId, avatarStatus: "PENDING", avatarPending: { not: null } },
      select: { id: true, name: true, avatarPending: true },
    }),
    db.club.findUnique({ where: { id: clubId }, select: { zonePrices: true, name: true, country: true } }),
    // Los pendientes de activación se consultan aparte para que sigan saliendo
    // completos aunque el admin esté en la página 3 o filtrando.
    db.player.findMany({
      where: { clubId, status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Tasa de asistencia: una sola agregación en vez de traer cada registro.
  const attendanceRows = await db.attendance.groupBy({
    by: ["playerId", "status"],
    where: { playerId: { in: players.map((p) => p.id) } },
    _count: { _all: true },
  });
  const attendanceStats = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows) {
    const stat = attendanceStats.get(row.playerId) ?? { present: 0, total: 0 };
    stat.total += row._count._all;
    if (row.status === "PRESENT") stat.present += row._count._all;
    attendanceStats.set(row.playerId, stat);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const zones = club?.zonePrices ? Object.keys(club.zonePrices as Record<string, unknown>) : [];
  const clubName = club?.name ?? "el club";
  const clubCountry = club?.country ?? "CO";

  // La lista ya viene filtrada y paginada desde la base.
  const filteredPlayers = players;

  function buildHref(opts: { categoryId?: string; gender?: string; zone?: string; page?: number }) {
    const p = new URLSearchParams();
    if (opts.categoryId) p.set("categoryId", opts.categoryId);
    if (opts.gender) p.set("gender", opts.gender);
    if (opts.zone) p.set("zone", opts.zone);
    if (query) p.set("q", query);
    if (opts.page && opts.page > 1) p.set("page", String(opts.page));
    const qs = p.toString();
    return `/dashboard/admin/players${qs ? `?${qs}` : ""}`;
  }

  /** Conserva los filtros actuales y solo cambia de página. */
  const pageHref = (n: number) =>
    buildHref({ categoryId: selectedCategory, gender: selectedGender, zone: selectedZone, page: n });

  return (
    <div>
      <Header title={t.common.players} subtitle={`${totalCount} ${t.common.players}`} />
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
                // `wa.me/3001234567` sin indicativo no abría el chat.
                // `normalizePhone` le antepone el del país del club.
                const digits = normalizePhone(p.phone || p.user.phone, clubCountry);
                const waHref = whatsappLink(
                  digits,
                  `Hola, te escribimos desde *${clubName}* 🏆\n\nQueremos recordarte que la inscripción de *${p.user.name}* está pendiente de pago para poder activar su cuenta en la plataforma.\n\n¡Quedamos atentos! 😊`
                );
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

        {/* Search */}
        <Suspense fallback={null}>
          <PlayerSearch defaultValue={q} />
        </Suspense>

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
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
            <h2 className="font-semibold">{t.common.allPlayers}</h2>
            {query && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {totalCount} resultado{totalCount !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {filteredPlayers.length === 0 ? (
              <div className="py-16 text-center">
                {query ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Sin resultados para &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  <>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                      {t.common.noPlayersYet}
                    </p>
                    <Link href="/dashboard/admin/players/new">
                      <Button variant="secondary">
                        <Plus size={16} /> {t.common.addFirstPlayer}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const level = calculateLevel(player.xp);
                // Viene de la agregación, no de cargar cada registro de asistencia.
                const att = attendanceStats.get(player.id);
                const attendancePct =
                  att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

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

          {/* Paginación — antes la página traía todos los jugadores de golpe. */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
              style={{ borderTop: "1px solid var(--border-primary)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link href={pageHref(currentPage - 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: "var(--border-primary)", color: "rgba(255,255,255,0.18)" }}>
                    ← Anterior
                  </span>
                )}
                <span className="text-xs font-semibold px-2" style={{ color: "var(--text-muted)" }}>
                  {currentPage} / {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link href={pageHref(currentPage + 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    Siguiente →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: "var(--border-primary)", color: "rgba(255,255,255,0.18)" }}>
                    Siguiente →
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
