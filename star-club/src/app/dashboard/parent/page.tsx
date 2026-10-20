import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Avatar } from "@/components/ui/avatar";
import {
  CheckCircle2, AlertTriangle, ArrowRight, MapPin, Clock, Flame, Shield,
  Trophy, Hourglass, CalendarDays, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import PaymentSubmitForm from "@/components/parent/payment-submit-form";
import {
  clubGreeting, daysUntilDue, dueLabel, sessionClockNow, formatSessionDate,
  formatSessionTime, capitalizeFirst,
} from "@/lib/dates";
import { xpProgress, xpForNextLevel, LEVEL_TITLES } from "@/lib/utils";

const OPEN = ["PENDING", "OVERDUE", "SUBMITTED"];
const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

const ATT_META: Record<string, { label: string; color: string }> = {
  PRESENT: { label: "Asistió",  color: "var(--success)" },
  LATE:    { label: "Tarde",    color: "var(--warning)" },
  EXCUSED: { label: "Excusado", color: "var(--info)" },
  ABSENT:  { label: "Faltó",    color: "var(--error)" },
};

export default async function ParentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const { playerId: selectedPlayerId } = await searchParams;

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          player: {
            include: {
              user: { select: { name: true, avatar: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const unreadNotifications = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  if (!parent || parent.children.length === 0) {
    return (
      <div>
        <Header title="Inicio" notificationCount={unreadNotifications} />
        <div className="p-4 md:p-8 text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-glow)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
            <Shield size={28} style={{ color: "var(--accent-light)" }} />
          </div>
          <p className="font-semibold mb-2">Sin deportista vinculado</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tu cuenta no está vinculada a ningún deportista. Contacta al administrador del club.
          </p>
        </div>
      </div>
    );
  }

  const allChildren = parent.children;
  const { player } = allChildren.find((c) => c.player.id === selectedPlayerId) ?? allChildren[0];
  const firstName = session.user.name?.split(" ")[0] ?? "";
  const childFirst = player.user.name.split(" ")[0];

  // Las sesiones guardan la hora de reloj en UTC (ver lib/dates): "ahora" y el
  // inicio del mes van en esa misma convención.
  const now = sessionClockNow();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const categoryFilter = player.categoryId
    ? { OR: [{ categoryId: player.categoryId }, { categoryId: null }] }
    : {};

  const [openPayments, upcoming, pastSessionsCount, monthAttendance] = await Promise.all([
    db.payment.findMany({
      where: { playerId: player.id, status: { in: OPEN } },
      orderBy: { dueDate: "asc" },
    }),
    db.session.findMany({
      where: { clubId: player.clubId, date: { gte: now }, ...categoryFilter },
      orderBy: { date: "asc" },
      take: 4,
      select: { id: true, title: true, date: true, type: true, location: true, notes: true },
    }),
    // Asistencia: solo sesiones que YA pasaron. Antes se contaban también las
    // futuras del mes y solo se leían 8 registros, así que un niño que iba a
    // todo salía con 53% y en rojo.
    db.session.count({
      where: { clubId: player.clubId, date: { gte: monthStart, lt: now }, ...categoryFilter },
    }),
    db.attendance.findMany({
      where: { playerId: player.id, session: { date: { gte: monthStart, lt: now } } },
      include: { session: { select: { title: true, date: true } } },
      orderBy: { session: { date: "desc" } },
    }),
  ]);

  const attended = monthAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const attendanceRate = pastSessionsCount > 0 ? Math.round((attended / pastSessionsCount) * 100) : null;
  const rateColor = attendanceRate === null ? "var(--text-muted)"
    : attendanceRate >= 80 ? "var(--success)" : attendanceRate >= 60 ? "var(--warning)" : "var(--error)";

  // ── Estado de pagos ──────────────────────────────────────────────────────
  const overdue   = openPayments.filter((p) => p.status === "OVERDUE");
  const submitted = openPayments.filter((p) => p.status === "SUBMITTED");
  const pending   = openPayments.filter((p) => p.status === "PENDING");
  const nextPending = pending[0] ?? null;
  const overdueTotal = overdue.reduce((s, p) => s + p.amount, 0);
  const dueSoon = nextPending && daysUntilDue(nextPending.dueDate) <= 7;
  // Lo que se puede pagar desde aquí: vencidos y el próximo si vence pronto.
  const payable = [...overdue, ...(dueSoon && nextPending ? [nextPending] : [])];

  type Tone = "danger" | "warning" | "info" | "success";
  const status: { tone: Tone; title: string; detail: string } =
    overdue.length > 0
      ? { tone: "danger", title: `Debes ${money(overdueTotal)}`, detail: `${overdue.length === 1 ? "1 pago vencido" : `${overdue.length} pagos vencidos`} de ${childFirst}` }
      : dueSoon && nextPending
        ? { tone: "warning", title: `${money(nextPending.amount)} · ${dueLabel(nextPending.dueDate).toLowerCase()}`, detail: nextPending.concept }
        : submitted.length > 0
          ? { tone: "info", title: "Pago en revisión", detail: "El club está verificando tu comprobante" }
          : { tone: "success", title: "Estás al día", detail: nextPending ? `Próximo pago: ${money(nextPending.amount)} · ${dueLabel(nextPending.dueDate).toLowerCase()}` : "No tienes pagos pendientes" };

  const TONE: Record<Tone, { color: string; Icon: typeof CheckCircle2 }> = {
    danger:  { color: "var(--error)",   Icon: AlertTriangle },
    warning: { color: "var(--warning)", Icon: Clock },
    info:    { color: "var(--info)",    Icon: Hourglass },
    success: { color: "var(--success)", Icon: CheckCircle2 },
  };
  const tone = TONE[status.tone];

  const progress = Math.round(xpProgress(player.xp, player.level));
  const nextLevelXp = xpForNextLevel(player.level);
  const [nextSession, ...laterSessions] = upcoming;

  return (
    <div>
      <Header title="Inicio" notificationCount={unreadNotifications} />

      <div className="p-4 md:p-8 space-y-4 max-w-3xl">

        {/* ── Saludo + selector de hijo ─────────────────────────────── */}
        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{clubGreeting()},</p>
            <h2 className="font-display text-[34px] leading-none tracking-wide mt-1">{firstName} 👋</h2>
          </div>
        </div>

        {allChildren.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Elegir deportista">
            {allChildren.map(({ player: child }) => {
              const active = child.id === player.id;
              return (
                <Link
                  key={child.id}
                  href={`/dashboard/parent?playerId=${child.id}`}
                  role="tab"
                  aria-selected={active}
                  className="flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-all"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-card)",
                    color: active ? "var(--on-accent)" : "var(--text-secondary)",
                    border: `1px solid ${active ? "transparent" : "var(--border-primary)"}`,
                  }}
                >
                  <Avatar name={child.user.name} src={child.user.avatar} size="sm" />
                  {child.user.name.split(" ")[0]}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Estado de pagos (lo primero que un papá necesita saber) ── */}
        <section
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${tone.color} 16%, var(--bg-card)) 0%, var(--bg-card) 75%)`,
            border: `1px solid color-mix(in srgb, ${tone.color} 30%, transparent)`,
          }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${tone.color} 18%, transparent)` }}>
              <tone.Icon size={22} style={{ color: tone.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: tone.color }}>Pagos</p>
              <p className="font-display text-[30px] leading-none tracking-wide mt-1">{status.title}</p>
              <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>{status.detail}</p>
            </div>
          </div>

          {payable.length > 0 && (
            <div className="mt-4 space-y-3">
              {payable.map((p) => (
                <div key={p.id} className="rounded-2xl p-3.5 space-y-2.5" style={{ background: "color-mix(in srgb, var(--bg-primary) 55%, transparent)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.concept}</p>
                      <p className="text-xs mt-0.5" style={{ color: p.status === "OVERDUE" ? "var(--error)" : "var(--text-muted)" }}>
                        {dueLabel(p.dueDate)}
                      </p>
                    </div>
                    <p className="font-display text-2xl tracking-wide flex-shrink-0">{money(p.amount)}</p>
                  </div>
                  <PaymentSubmitForm paymentId={p.id} />
                </div>
              ))}
            </div>
          )}

          <Link href="/dashboard/parent/payments"
            className="mt-4 flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl text-sm font-bold transition-opacity hover:opacity-90"
            style={payable.length > 0
              ? { background: "var(--accent)", color: "var(--on-accent)" }
              : { background: "color-mix(in srgb, white 6%, transparent)", color: "var(--text-primary)" }}>
            {payable.length > 0 ? "Pagar en línea o ver detalle" : "Ver historial de pagos"} <ArrowRight size={15} />
          </Link>
        </section>

        {/* ── Deportista: nivel, XP, racha y asistencia ─────────────── */}
        <section className="rounded-3xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Avatar name={player.user.name} src={player.user.avatar} size="lg" />
              <span className="absolute -bottom-1 -right-1 font-display text-sm leading-none px-1.5 py-1 rounded-lg"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                {player.level}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[17px] truncate">{player.user.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {player.category?.name ?? "Sin categoría"}
                {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                {player.position ? ` · ${player.position}` : ""}
              </p>
            </div>
            {player.streak > 0 && (
              <div className="flex flex-col items-center flex-shrink-0 px-2.5 py-1.5 rounded-2xl"
                style={{ background: "color-mix(in srgb, var(--accent-2) 14%, transparent)" }}
                title={`${player.streak} días de racha`}>
                <Flame size={18} style={{ color: "var(--accent-2)" }} />
                <span className="font-display text-lg leading-none mt-0.5" style={{ color: "var(--accent-2)" }}>{player.streak}</span>
              </div>
            )}
          </div>

          {/* Nivel */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-semibold">
                <Trophy size={13} style={{ color: "var(--accent-light)" }} />
                Nivel {player.level} · {LEVEL_TITLES[player.level] ?? ""}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {player.xp.toLocaleString("es-CO")}{nextLevelXp < 999999 ? ` / ${nextLevelXp.toLocaleString("es-CO")}` : ""} XP
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}
              role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al siguiente nivel">
              <div className="h-full rounded-full xp-bar-animate"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
            </div>
          </div>

          {/* Asistencia del mes */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-primary)" }}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--text-muted)" }}>Asistencia este mes</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl leading-none tracking-wide" style={{ color: rateColor }}>
                    {attendanceRate === null ? "—" : `${attendanceRate}%`}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {pastSessionsCount > 0 ? `${attended} de ${pastSessionsCount} sesiones` : "Aún no hay sesiones este mes"}
                  </span>
                </p>
              </div>
              <Link href="/dashboard/parent/reports" className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "var(--accent-light)" }}>
                Ver reporte <ChevronRight size={14} />
              </Link>
            </div>
            {monthAttendance.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap" aria-label="Últimas sesiones">
                {monthAttendance.slice(0, 12).reverse().map((a) => {
                  const meta = ATT_META[a.status] ?? ATT_META.ABSENT;
                  return (
                    <span key={a.id}
                      title={`${a.session.title} · ${formatSessionDate(a.session.date, { day: "numeric", month: "short" })} · ${meta.label}`}
                      className="w-6 h-6 rounded-lg"
                      style={{ background: `color-mix(in srgb, ${meta.color} 22%, transparent)`, border: `1.5px solid ${meta.color}` }} />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Próximo entreno ───────────────────────────────────────── */}
        <section className="rounded-3xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--text-muted)" }}>Próximo entreno</h2>
            <CalendarDays size={16} style={{ color: "var(--accent-light)" }} />
          </div>

          {!nextSession ? (
            <p className="text-sm py-3" style={{ color: "var(--text-muted)" }}>No hay entrenos programados por ahora.</p>
          ) : (
            <>
              <div className="flex gap-4 items-stretch">
                <div className="w-[68px] flex-shrink-0 rounded-2xl flex flex-col items-center justify-center py-2"
                  style={{ background: nextSession.type === "MATCH" ? "color-mix(in srgb, var(--accent-2) 18%, transparent)" : "var(--accent-glow)" }}>
                  <span className="text-[11px] font-bold uppercase" style={{ color: nextSession.type === "MATCH" ? "var(--accent-2)" : "var(--accent-light)" }}>
                    {formatSessionDate(nextSession.date, { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="font-display text-[34px] leading-none">{formatSessionDate(nextSession.date, { day: "numeric" })}</span>
                  <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                    {formatSessionDate(nextSession.date, { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  {nextSession.type === "MATCH" && (
                    <span className="inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md mb-1"
                      style={{ background: "var(--accent-2)", color: "#fff" }}>Partido</span>
                  )}
                  <p className="font-bold leading-snug">{nextSession.title}</p>
                  <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={13} /> {formatSessionTime(nextSession.date)}
                  </p>
                  {nextSession.location && (
                    <p className="text-sm mt-0.5 flex items-center gap-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      <MapPin size={13} className="flex-shrink-0" /> <span className="truncate">{nextSession.location}</span>
                    </p>
                  )}
                </div>
              </div>
              {nextSession.notes && (
                <p className="text-sm mt-3.5 px-3.5 py-2.5 rounded-xl" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  📌 {nextSession.notes}
                </p>
              )}

              {laterSessions.length > 0 && (
                <ul className="mt-4 pt-3 space-y-0.5" style={{ borderTop: "1px solid var(--border-primary)" }}>
                  {laterSessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: s.type === "MATCH" ? "var(--accent-2)" : "var(--accent)" }} />
                      <span className="flex-1 min-w-0 truncate">{s.title}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                        {capitalizeFirst(formatSessionDate(s.date, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, ""))}
                        {" · "}{formatSessionTime(s.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
