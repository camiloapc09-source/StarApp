import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle2, Clock, TicketX } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import RaffleCreateForm from "@/components/admin/raffle-create-form";
import RaffleStatusButton from "@/components/admin/raffle-status-button";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  OPEN:     { label: "Abierta",    variant: "success" },
  CLOSED:   { label: "Cerrada",    variant: "warning" },
  FINISHED: { label: "Finalizada", variant: "default" },
};

export default async function AdminRifasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const raffles = await db.raffle.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: {
      tickets: { select: { id: true, status: true } },
    },
  });

  const open     = raffles.filter((r) => r.status === "OPEN");
  const closed   = raffles.filter((r) => r.status === "CLOSED");
  const finished = raffles.filter((r) => r.status === "FINISHED");

  const stats = {
    active:   open.length,
    total:    raffles.length,
    revenue:  raffles.reduce((s, r) => s + r.tickets.filter((t) => t.status === "PAID").length * r.ticketPrice, 0),
    pending:  raffles.reduce((s, r) => s + r.tickets.filter((t) => t.status === "TAKEN").length, 0),
  };

  return (
    <div>
      <Header title="Rifas" subtitle={`${stats.active} rifa${stats.active !== 1 ? "s" : ""} activa${stats.active !== 1 ? "s" : ""}`} />
      <div className="p-4 md:p-8 space-y-6">

        <RaffleCreateForm />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Rifas activas</p>
            <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>{stats.active}</p>
          </Card>
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Por cobrar</p>
            <p className="text-2xl font-bold" style={{ color: stats.pending > 0 ? "var(--warning)" : "var(--text-primary)" }}>
              {stats.pending}
            </p>
          </Card>
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Total rifas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Recaudado</p>
            <p className="text-xl font-bold" style={{ color: "var(--success)" }}>
              ${stats.revenue.toLocaleString("es-CO")}
            </p>
          </Card>
        </div>

        {/* Open raffles */}
        {open.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Ticket size={15} style={{ color: "var(--success)" }} /> Abiertas
            </h3>
            <div className="space-y-3">
              {open.map((r) => <RaffleRow key={r.id} raffle={r} />)}
            </div>
          </Card>
        )}

        {/* Closed raffles */}
        {closed.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TicketX size={15} style={{ color: "var(--warning)" }} /> Cerradas
            </h3>
            <div className="space-y-3">
              {closed.map((r) => <RaffleRow key={r.id} raffle={r} />)}
            </div>
          </Card>
        )}

        {/* Finished raffles */}
        {finished.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
              Historial
            </h3>
            <div className="space-y-3">
              {finished.map((r) => <RaffleRow key={r.id} raffle={r} compact />)}
            </div>
          </Card>
        )}

        {raffles.length === 0 && (
          <Card>
            <div className="text-center py-10">
              <Ticket size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No hay rifas todavía. Crea la primera.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function RaffleRow({
  raffle,
  compact = false,
}: {
  raffle: {
    id: string;
    title: string;
    prize: string | null;
    ticketPrice: number;
    status: string;
    drawDate: Date | null;
    createdAt: Date;
    tickets: { id: string; status: string }[];
  };
  compact?: boolean;
}) {
  const meta = STATUS_META[raffle.status] ?? { label: raffle.status, variant: "default" as const };
  const paid    = raffle.tickets.filter((t) => t.status === "PAID").length;
  const pending = raffle.tickets.filter((t) => t.status === "TAKEN").length;
  const total   = raffle.tickets.length;

  return (
    <div
      className="flex items-start gap-4 rounded-xl p-4 border"
      style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.20)" }}
      >
        <Ticket size={18} style={{ color: "#DEC4FF" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-sm">{raffle.title}</p>
            {raffle.prize && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,184,0,0.80)" }}>
                Premio: {raffle.prize}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <CheckCircle2 size={10} style={{ color: "var(--success)" }} /> {paid} pagados
              </span>
              <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Clock size={10} style={{ color: "var(--warning)" }} /> {pending} por cobrar
              </span>
              <span style={{ color: "var(--text-muted)" }}>{total}/100 tomados</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              ${raffle.ticketPrice.toLocaleString("es-CO")} / número
              {raffle.drawDate && ` · Sorteo: ${format(new Date(raffle.drawDate), "d MMM yyyy", { locale: es })}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <p className="text-sm font-bold" style={{ color: "var(--success)" }}>
              ${(paid * raffle.ticketPrice).toLocaleString("es-CO")}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="flex gap-2 mt-3">
            <Link
              href={`/dashboard/admin/rifas/${raffle.id}`}
              className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(139,92,246,0.12)", color: "#DEC4FF", border: "1px solid rgba(139,92,246,0.20)" }}
            >
              Ver cartón
            </Link>
            <RaffleStatusButton raffleId={raffle.id} currentStatus={raffle.status} />
          </div>
        )}
      </div>
    </div>
  );
}
