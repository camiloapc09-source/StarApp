import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Plus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { calculateLevel } from "@/lib/utils";
import NewInviteForm from "@/components/admin/new-invite-form";
import AvatarReviewList from "@/components/admin/avatar-review-list";

type Props = { searchParams: Promise<{ categoryId?: string }> };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { categoryId: selectedCategory } = await searchParams;
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const t = await getDictionary();

  const [players, categories, pendingAvatars] = await Promise.all([
    db.player.findMany({
      where: selectedCategory ? { clubId, categoryId: selectedCategory } : { clubId },
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
  ]);

  return (
    <div>
      <Header title={t.common.players} subtitle={`${players.length} ${t.common.players}`} />
      <div className="p-8 space-y-6">

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

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/admin/players">
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
              <Link key={cat.id} href={`/dashboard/admin/players?categoryId=${cat.id}`}>
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
