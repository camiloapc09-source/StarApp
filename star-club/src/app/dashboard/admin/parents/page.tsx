import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ResetPasswordButton from "@/components/admin/reset-password-button";
import MergeParentsButton from "@/components/admin/merge-parents-button";
import BulkResetParentsButton from "@/components/admin/bulk-reset-parents-button";
import NewInviteForm from "@/components/admin/new-invite-form";
import { AlertTriangle, CheckCircle2, GitMerge, Users } from "lucide-react";
import Link from "next/link";
import { ParentSentBadge } from "@/components/admin/parent-sent-badge";

export default async function AdminParentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const clubId   = (session.user as { clubId?: string; clubSlug?: string }).clubId   ?? "club-star";
  const clubSlug = (session.user as { clubId?: string; clubSlug?: string }).clubSlug ?? "";

  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
  const clubName = club?.name ?? "el club";

  const parents = await db.parent.findMany({
    where: { user: { clubId } },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, setupCompleted: true } },
      children: {
        include: {
          player: {
            select: {
              id: true,
              documentNumber: true,
              category: { select: { name: true } },
              user: { select: { name: true } },
              payments: {
                where: { status: { in: ["PENDING", "OVERDUE"] } },
                select: { id: true, status: true },
              },
            },
          },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  // Group by normalized name to detect duplicates
  const groups = new Map<string, typeof parents>();
  for (const p of parents) {
    const key = p.user.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const pendingSetup  = parents.filter((p) => !p.user.setupCompleted);
  const readyCount    = parents.length - pendingSetup.length;
  const duplicateCount = [...groups.values()].filter((g) => g.length > 1).length;

  return (
    <div>
      <Header
        title="Acudientes"
        subtitle={`${parents.length} acudientes · ${readyCount} configurados`}
      />
      <div className="p-4 md:p-8 space-y-6">

        {/* Invite new parent */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Generar código de registro</h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Comparte el enlace con el acudiente. Podrá elegir su correo, contraseña y vincular a sus hijos.
          </p>
          <NewInviteForm defaultRole="PARENT" hideRoleSelect={true} />
        </Card>

        {/* Duplicates banner */}
        {duplicateCount > 0 && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <GitMerge size={16} style={{ color: "#A78BFA", flexShrink: 0 }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              <span className="font-semibold" style={{ color: "#C4B5FD" }}>
                {duplicateCount} acudiente{duplicateCount !== 1 ? "s" : ""} con cuentas duplicadas.
              </span>
              {" "}Usa el botón "Fusionar" para unirlas en una sola con todos los hijos vinculados.
            </p>
          </div>
        )}

        {/* Pending setup banner */}
        {pendingSetup.length > 0 && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <AlertTriangle size={16} style={{ color: "#FCD34D", flexShrink: 0 }} />
            <p className="text-sm flex-1 min-w-[240px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              <span className="font-semibold text-yellow-300">{pendingSetup.length} acudiente{pendingSetup.length !== 1 ? "s" : ""}</span>
              {" "}aún no han configurado su cuenta. Resetéalos todos a una clave temporal y envía el mensaje al grupo.
            </p>
            <BulkResetParentsButton pendingCount={pendingSetup.length} clubName={clubName} />
          </div>
        )}

        {/* Parents list — grouped */}
        {parents.length === 0 ? (
          <Card className="p-10 text-center">
            <Users size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay acudientes registrados todavía.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...groups.values()].map((group) => {
              const isDuplicate = group.length > 1;

              // For duplicates, wrap in a highlighted group card
              const cards = group.map((parent) => {
                const emailBroken = !parent.user.email.includes("@") || parent.user.email.endsWith(".internal");
                const needsSetup  = !parent.user.setupCompleted;
                const totalPending = parent.children.reduce((s, c) => s + c.player.payments.length, 0);

                return (
                  <div
                    key={parent.id}
                    className="rounded-2xl p-5 space-y-4"
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${needsSetup ? "rgba(251,191,36,0.25)" : "var(--border-primary)"}`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={parent.user.name} size="md" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold">{parent.user.name}</p>
                            {needsSetup ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(251,191,36,0.15)", color: "#FCD34D" }}>
                                Sin configurar
                              </span>
                            ) : (
                              <CheckCircle2 size={13} style={{ color: "#34D399" }} />
                            )}
                            {needsSetup && <ParentSentBadge userId={parent.user.id} />}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: emailBroken ? "#F87171" : "var(--text-muted)" }}>
                            {emailBroken ? "Usuario temporal: " : ""}{parent.user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {totalPending > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(255,184,0,0.10)", color: "#FCD34D", border: "1px solid rgba(255,184,0,0.20)" }}>
                            {totalPending} pago{totalPending !== 1 ? "s" : ""} pendiente{totalPending !== 1 ? "s" : ""}
                          </span>
                        )}
                        <ResetPasswordButton
                          userId={parent.user.id}
                          userName={parent.user.name}
                          role="PARENT"
                          phone={parent.phone ?? parent.user.phone ?? undefined}
                          clubSlug={clubSlug}
                        />
                      </div>
                    </div>

                    {/* Children */}
                    {parent.children.length === 0 ? (
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Sin hijos vinculados</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {parent.children.map((link) => {
                          const hasPending = link.player.payments.length > 0;
                          return (
                            <Link
                              key={link.id}
                              href={`/dashboard/admin/players/${link.player.id}`}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:opacity-80"
                              style={{
                                background: hasPending ? "rgba(255,184,0,0.05)" : "var(--bg-elevated)",
                                border: `1px solid ${hasPending ? "rgba(255,184,0,0.20)" : "var(--border-subtle)"}`,
                              }}
                            >
                              <Avatar name={link.player.user.name} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{link.player.user.name}</p>
                                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                                  {link.player.category?.name ?? "Sin categoría"}
                                  {link.player.documentNumber ? ` · Doc: ${link.player.documentNumber}` : ""}
                                </p>
                              </div>
                              {hasPending && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: "rgba(255,184,0,0.15)", color: "#FCD34D" }}>
                                  {link.player.payments.length}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Setup hint */}
                    {needsSetup && parent.children.length > 0 && (
                      <p className="text-[11px] px-3 py-2 rounded-xl"
                        style={{ background: "rgba(251,191,36,0.06)", color: "rgba(252,211,77,0.70)" }}>
                        Dile al acudiente que ingrese con el documento de{" "}
                        <strong>{parent.children[0].player.user.name}</strong>
                        {" "}como usuario y contraseña.
                      </p>
                    )}
                  </div>
                );
              });

              if (!isDuplicate) return cards[0];

              // Duplicate group wrapper
              const [a, b] = group;
              type MergeOption = { userId: string; name: string; email: string; setupCompleted: boolean; children: { name: string; documentNumber: string | null; category: string | null }[] };
              const toOption = (p: typeof parents[0]): MergeOption => ({
                userId: p.user.id,
                name: p.user.name,
                email: p.user.email,
                setupCompleted: p.user.setupCompleted,
                children: p.children.map((c) => ({
                  name: c.player.user.name,
                  documentNumber: c.player.documentNumber,
                  category: c.player.category?.name ?? null,
                })),
              });
              const mergeOptions: [MergeOption, MergeOption] = [toOption(a), toOption(b)];

              return (
                <div
                  key={group[0].user.name}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1.5px solid rgba(139,92,246,0.35)" }}
                >
                  {/* Duplicate header */}
                  <div className="px-5 py-3 flex items-center justify-between gap-3"
                    style={{ background: "rgba(139,92,246,0.10)", borderBottom: "1px solid rgba(139,92,246,0.20)" }}>
                    <div className="flex items-center gap-2">
                      <GitMerge size={14} style={{ color: "#A78BFA" }} />
                      <span className="text-xs font-bold" style={{ color: "#C4B5FD" }}>
                        Cuenta duplicada — {group[0].user.name.trim()}
                      </span>
                    </div>
                    <MergeParentsButton options={mergeOptions} />
                  </div>

                  {/* Individual cards inside */}
                  <div className="divide-y" style={{ borderColor: "rgba(139,92,246,0.15)" }}>
                    {cards.map((card) => card)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
