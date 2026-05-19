import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import RaffleGridAdmin from "@/components/admin/raffle-grid-admin";
import RaffleStatusButton from "@/components/admin/raffle-status-button";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  OPEN:     { label: "Abierta",    variant: "success" },
  CLOSED:   { label: "Cerrada",    variant: "warning" },
  FINISHED: { label: "Finalizada", variant: "default" },
};

export default async function AdminRifaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";
  const { id } = await params;

  const [raffle, club] = await Promise.all([
    db.raffle.findUnique({
      where: { id },
      include: {
        tickets: {
          select: {
            id: true,
            number: true,
            status: true,
            ownerName: true,
            takenAt: true,
            paidAt: true,
            proofUrl: true,
            takenById: true,
            takenBy: { select: { name: true, id: true } },
          },
          orderBy: { number: "asc" },
        },
      },
    }),
    db.club.findUnique({ where: { id: clubId }, select: { name: true, logo: true } }),
  ]);

  if (!raffle || raffle.clubId !== clubId) notFound();

  const meta = STATUS_META[raffle.status] ?? { label: raffle.status, variant: "default" as const };
  const paid = raffle.tickets.filter((t) => t.status === "PAID").length;
  const pending = raffle.tickets.filter((t) => t.status === "TAKEN").length;

  return (
    <div>
      <Header
        title={raffle.title}
        subtitle={`${raffle.tickets.length} números tomados · ${paid} pagados`}
      />
      <div className="p-4 md:p-8 space-y-5 max-w-2xl">

        {/* Back + status */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/admin/rifas"
            className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={13} /> Volver
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <RaffleStatusButton raffleId={raffle.id} currentStatus={raffle.status} />
          </div>
        </div>

        {/* Info card */}
        <Card>
          <div className="space-y-1.5">
            {raffle.prize && (
              <p className="text-sm">
                <span className="font-semibold" style={{ color: "rgba(255,184,0,0.90)" }}>Premio: </span>
                <span style={{ color: "var(--text-secondary)" }}>{raffle.prize}</span>
              </p>
            )}
            {raffle.description && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{raffle.description}</p>
            )}
            <p className="text-sm">
              <span style={{ color: "var(--text-muted)" }}>Valor por número: </span>
              <span className="font-semibold" style={{ color: "var(--success)" }}>
                ${raffle.ticketPrice.toLocaleString("es-CO")}
              </span>
            </p>
            {raffle.drawDate && (
              <p className="text-sm">
                <span style={{ color: "var(--text-muted)" }}>Fecha de sorteo: </span>
                <span className="font-semibold">
                  {format(new Date(raffle.drawDate), "d 'de' MMMM yyyy", { locale: es })}
                </span>
              </p>
            )}
            <p className="text-sm">
              <span style={{ color: "var(--text-muted)" }}>Recaudado: </span>
              <span className="font-bold" style={{ color: "var(--success)" }}>
                ${(paid * raffle.ticketPrice).toLocaleString("es-CO")}
              </span>
              {pending > 0 && (
                <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                  (+ ${(pending * raffle.ticketPrice).toLocaleString("es-CO")} por cobrar)
                </span>
              )}
            </p>
          </div>
        </Card>

        {/* Grid */}
        <RaffleGridAdmin
          raffleId={raffle.id}
          tickets={raffle.tickets.map((t) => ({
            ...t,
            takenAt: t.takenAt.toISOString(),
            paidAt: t.paidAt?.toISOString() ?? null,
          }))}
          clubLogo={club?.logo ?? null}
          clubName={club?.name ?? "Club"}
          raffleName={raffle.title}
          prize={raffle.prize}
          ticketPrice={raffle.ticketPrice}
          drawDate={raffle.drawDate?.toISOString() ?? null}
        />

        {/* Taken list */}
        {raffle.tickets.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
              Lista de participantes
            </h3>
            <div className="space-y-2">
              {raffle.tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                      style={{
                        background: t.status === "PAID" ? "rgba(0,255,135,0.12)" : "rgba(255,184,0,0.10)",
                        color: t.status === "PAID" ? "var(--success)" : "var(--warning)",
                        border: `1px solid ${t.status === "PAID" ? "rgba(0,255,135,0.25)" : "rgba(255,184,0,0.20)"}`,
                      }}
                    >
                      {String(t.number).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t.ownerName ?? t.takenBy?.name ?? "—"}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(t.takenAt), "d MMM yyyy", { locale: es })}
                        {t.paidAt && ` · Pagó: ${format(new Date(t.paidAt), "d MMM", { locale: es })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.proofUrl && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,135,0.08)", color: "var(--success)" }}>
                        Comprobante ✓
                      </span>
                    )}
                    <Badge variant={t.status === "PAID" ? "success" : "warning"}>
                      {t.status === "PAID" ? "Pagado" : "Por cobrar"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
