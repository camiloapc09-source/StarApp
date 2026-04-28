import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Lock } from "lucide-react";
import NewInviteForm from "@/components/admin/new-invite-form";

export default async function CoachInvitesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/");

  const clubId = (session.user as { clubId?: string }).clubId ?? "";
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { coachCanInvite: true },
  });

  if (!club?.coachCanInvite) {
    return (
      <div>
        <Header title="Invitaciones" subtitle="Códigos de registro para deportistas" />
        <div className="p-4 md:p-8">
          <Card className="py-16 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,184,0,0.10)", border: "1px solid rgba(255,184,0,0.20)" }}
            >
              <Lock size={24} style={{ color: "var(--warning)" }} />
            </div>
            <p className="font-semibold mb-2">Función no habilitada</p>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
              Tu administrador no ha habilitado la generación de códigos de invitación para entrenadores.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const invites = await db.invite.findMany({
    where: { clubId, createdBy: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unused = invites.filter((i) => !i.used);
  const used = invites.filter((i) => i.used);

  return (
    <div>
      <Header
        title="Invitaciones"
        subtitle={`${unused.length} pendiente${unused.length !== 1 ? "s" : ""}`}
      />
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <div className="p-5">
            <h3 className="text-sm font-semibold mb-1">Generar código para nuevo deportista</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Comparte el enlace con el deportista para que complete su registro.
            </p>
            <NewInviteForm defaultRole="PLAYER" hideRoleSelect endpoint="/api/coach/invites" />
          </div>
        </Card>

        {unused.length > 0 && (
          <Card>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Pendientes ({unused.length})</h3>
              {unused.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div>
                    <div className="text-sm font-mono font-bold tracking-widest">{inv.code}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Badge variant="success">PLAYER</Badge>
                      {format(new Date(inv.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {used.length > 0 && (
          <Card>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-muted)" }}>
                Utilizados ({used.length})
              </h3>
              {used.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-xl opacity-60"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div>
                    <div className="text-sm font-mono font-bold tracking-widest line-through">{inv.code}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Badge>PLAYER</Badge>
                      {format(new Date(inv.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {invites.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Aún no has generado ningún código.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
