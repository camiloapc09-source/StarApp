import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculateLevel } from "@/lib/utils";
import PlayerActivateButton from "@/components/admin/player-activate-button";
import AdminEditPlayerButton from "@/components/admin/admin-edit-player-button";
import DeletePlayerButton from "@/components/admin/delete-player-button";
import ResetPasswordButton from "@/components/admin/reset-password-button";
import PlayerNotesPanel from "@/components/admin/player-notes-panel";
import InviteParentButton from "@/components/admin/invite-parent-button";

type Props = { params: Promise<{ id: string }> };

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [player, categories] = await Promise.all([
    db.player.findFirst({
      where: { id, clubId },
      include: {
        user: true,
        category: true,
        parentLinks: {
          include: {
            parent: { include: { user: true } },
          },
        },
        payments: { orderBy: { dueDate: "desc" }, take: 8 },
        attendances: { select: { status: true } },
        playerMissions: { where: { status: "COMPLETED" }, select: { id: true } },
        playerNotes: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!player) redirect("/dashboard/admin/players");

  const level = calculateLevel(player.xp);
  const presentCount = player.attendances.filter((a) => a.status === "PRESENT").length;
  const totalCount = player.attendances.length;
  const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const pendingPayments = player.payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");

  const statusMeta: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:   { bg: "rgba(0,255,135,0.1)",  color: "var(--success)",    label: "Activo" },
    PENDING:  { bg: "rgba(255,184,0,0.1)",  color: "var(--warning)",    label: "Pendiente" },
    INACTIVE: { bg: "rgba(150,150,150,0.1)", color: "var(--text-muted)", label: "Inactivo" },
  };
  const statusStyle = statusMeta[player.status] ?? statusMeta.INACTIVE;

  // Age-category mismatch check
  let ageMismatch: string | null = null;
  if (player.dateOfBirth && player.category) {
    const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
    const { ageMax, ageMin, name: catName } = player.category;
    if (typeof ageMax === "number" && age > ageMax) {
      ageMismatch = `${player.user.name} tiene ${age} años pero la categoría ${catName} es hasta los ${ageMax} años. Considera cambiarla.`;
    } else if (typeof ageMin === "number" && age < ageMin) {
      ageMismatch = `${player.user.name} tiene ${age} años pero la categoría ${catName} empieza desde los ${ageMin} años.`;
    }
  }

  return (
    <div>
      <Header title={player.user.name} subtitle={player.category?.name ?? "Sin categoría"} />
      <div className="p-4 md:p-8 space-y-6">

        {/* Back + status */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/admin/players"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={16} /> Volver a Deportistas
          </Link>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Pending-approval banner */}
        {player.status === "PENDING" && (
          <div
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border"
            style={{ background: "rgba(255,184,0,0.05)", borderColor: "var(--warning)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--warning)" }}>
                Registro pendiente de aprobación
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {player.user.name} se registró con un código de invitación y está esperando activación.
              </p>
            </div>
            <PlayerActivateButton playerId={player.id} playerName={player.user.name} dateOfBirth={player.dateOfBirth?.toISOString() ?? null} />
          </div>
        )}

        {/* Age-category mismatch banner */}
        {ageMismatch && (
          <div
            className="flex items-start gap-3 px-5 py-4 rounded-xl border"
            style={{ background: "rgba(255,184,0,0.05)", borderColor: "var(--warning)" }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{ageMismatch}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal info */}
          <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={player.user.name} src={player.user.avatar ?? undefined} size="lg" />
                <div>
                  <h2 className="font-semibold text-base">{player.user.name}</h2>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{player.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <AdminEditPlayerButton
                player={{
                  id: player.id,
                  position: player.position,
                  jerseyNumber: player.jerseyNumber,
                  paymentDay: player.paymentDay,
                  monthlyAmount: player.monthlyAmount,
                  dateOfBirth: player.dateOfBirth?.toISOString() ?? null,
                  documentNumber: player.documentNumber,
                  address: player.address,
                  phone: player.phone,
                  categoryId: player.categoryId,
                  user: { name: player.user.name, email: player.user.email },
                }}
                categories={categories}
              />
              <DeletePlayerButton playerId={player.id} playerName={player.user.name} />
              <ResetPasswordButton userId={player.user.id} userName={player.user.name} role="PLAYER" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {player.dateOfBirth && (
                <>
                  <InfoRow label="Fecha de nacimiento" value={format(player.dateOfBirth, "dd/MM/yyyy", { locale: es })} />
                  <InfoRow
                    label="Edad"
                    value={`${new Date().getFullYear() - player.dateOfBirth.getFullYear()} años`}
                  />
                </>
              )}
              {player.documentNumber && <InfoRow label="Documento" value={player.documentNumber} />}
              {player.phone && <InfoRow label="Teléfono / WhatsApp" value={player.phone} />}
              {player.address && <InfoRow label="Dirección" value={player.address} />}
              {player.category && <InfoRow label="Categoría" value={player.category.name} />}
              {player.jerseyNumber != null && <InfoRow label="Camiseta" value={`#${player.jerseyNumber}`} />}
              {player.position && <InfoRow label="Posición" value={player.position} />}
              {player.joinDate && (
                <InfoRow label="Fecha de ingreso" value={format(player.joinDate, "dd/MM/yyyy", { locale: es })} />
              )}
              {player.paymentDay != null && !( player.monthlyAmount === 0) && <InfoRow label="Dia de pago" value={`Dia ${player.paymentDay}`} />}
              {player.monthlyAmount === 0 ? (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Mensualidad</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    BECADO
                  </span>
                </div>
              ) : player.monthlyAmount != null ? (
                <InfoRow label="Monto mensual" value={`$${player.monthlyAmount.toLocaleString("es-CO")}`} />
              ) : null}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Nivel" value={`Lv. ${level}`} sub={`${player.xp} XP`} accent />
              <StatCard label="Asistencia" value={`${attendancePct}%`} sub={`${presentCount} / ${totalCount} sesiones`} />
              <StatCard label="Racha" value={`${player.streak}`} sub="días consecutivos" />
              <StatCard label="Misiones" value={`${player.playerMissions.length}`} sub="completadas" />
            </div>
          </Card>
        </div>

        {/* Parent / Guardian */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Acudiente / Tutor</h3>
            {player.parentLinks.length === 0 && (
              <InviteParentButton playerId={player.id} playerName={player.user.name} />
            )}
          </div>
          {player.parentLinks.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Sin acudiente vinculado. Genera un enlace de invitación para que el padre se registre.
            </p>
          ) : (
            <div className="space-y-4">
              {player.parentLinks.map((link) => (
                <div key={link.id}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                    <InfoRow label="Nombre" value={link.parent.user.name} />
                    <InfoRow label="Email" value={link.parent.user.email} />
                    {link.parent.phone && <InfoRow label="Teléfono / WhatsApp" value={link.parent.phone} />}
                    {link.parent.relation && <InfoRow label="Relación" value={link.parent.relation} />}
                  </div>
                  <div className="mt-3">
                    <ResetPasswordButton userId={link.parent.user.id} userName={link.parent.user.name} role="PARENT" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payments */}
        {player.payments.length > 0 ? (
          <Card className="p-0 overflow-hidden">
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <h3 className="text-sm font-semibold">Pagos</h3>
              {pendingPayments.length > 0 && (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,184,0,0.1)", color: "var(--warning)" }}
                >
                  {pendingPayments.length} pendiente{pendingPayments.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {player.payments.map((payment) => {
                const isPaid = payment.status === "COMPLETED";
                const isOverdue = payment.status === "OVERDUE";
                return (
                  <div key={payment.id} className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <p className="font-medium">{payment.concept}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Vence: {format(payment.dueDate, "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${payment.amount.toLocaleString("es-CO")}</p>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: isPaid ? "var(--success)" : isOverdue ? "var(--error)" : "var(--warning)",
                        }}
                      >
                        {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-4 md:p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No hay pagos registrados aún.
            </p>
          </Card>
        )}

        {/* Coach notes */}
        <Card className="p-6">
          <PlayerNotesPanel
            playerId={player.id}
            initialNotes={player.playerNotes.map((n) => ({
              id: n.id,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
              authorId: n.authorId,
            }))}
            authorName={session.user.name ?? "Admin"}
          />
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="font-black text-2xl leading-none"
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}
