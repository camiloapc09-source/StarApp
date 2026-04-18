import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { calculateLevel } from "@/lib/utils";
import { getDictionary } from "@/lib/dict";
import { Zap, Users } from "lucide-react";
import Link from "next/link";

type Props = { searchParams: Promise<{ categoryId?: string }> };

export default async function CoachPlayersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/login");

  const { categoryId: selectedCategory } = await searchParams;
  const dict = await getDictionary();
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [players, categories] = await Promise.all([
    db.player.findMany({
      where: {
        clubId,
        status: "ACTIVE",
        ...(selectedCategory ? { categoryId: selectedCategory } : {}),
      },
      orderBy: { user: { name: "asc" } },
      include: {
        user: { select: { name: true, email: true, avatar: true } },
        category: true,
        attendances: { select: { status: true } },
      },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Header
        title={dict.common.players}
        subtitle={`${players.length} deportista${players.length !== 1 ? "s" : ""} activo${players.length !== 1 ? "s" : ""}`}
      />
      <div className="p-8 space-y-6">

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/coach/players">
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
            <Link key={cat.id} href={`/dashboard/coach/players?categoryId=${cat.id}`}>
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

        {/* Players list */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border-primary)" }}>
            <Users size={16} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold text-sm">Deportistas activos</h2>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {players.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No hay jugadores en esta categoría.
                </p>
              </div>
            ) : (
              players.map((player) => {
                const level = calculateLevel(player.xp);
                const present = player.attendances.filter((a) => a.status === "PRESENT").length;
                const total   = player.attendances.length;
                const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

                return (
                  <div
                    key={player.id}
                    className="relative flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <Avatar name={player.user.name} src={player.user.avatar} size="md" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{player.user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {player.category?.name ?? "Sin categoría"}
                        {player.position ? ` · ${player.position}` : ""}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
                          <Zap size={13} />
                          <span>{player.xp}</span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Lv.{level}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{pct}%</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Asistencia</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{present}/{total}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sesiones</p>
                      </div>
                    </div>

                    <Badge variant="success">Activo</Badge>
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
