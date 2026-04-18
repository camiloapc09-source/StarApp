import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/dict";
import NewInviteForm from "@/components/admin/new-invite-form";
import { InviteDeleteButton } from "@/components/admin/invite-delete-button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function InvitesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const invites = await db.invite.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const dict = await getDictionary();

  const unused = invites.filter((i) => !i.used);
  const used = invites.filter((i) => i.used);

  return (
    <div>
      <Header title={dict.common.players} subtitle={`${unused.length} pendiente${unused.length !== 1 ? "s" : ""}`} />
      <div className="p-8 space-y-6">
        <Card>
          <div className="p-5">
            <h3 className="text-sm font-semibold mb-4">Generar código de invitación</h3>
            <NewInviteForm />
          </div>
        </Card>

        {unused.length > 0 && (
          <Card>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Pendientes ({unused.length})</h3>
              {unused.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                  <div>
                    <div className="text-sm font-mono font-bold tracking-widest">{inv.code}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Badge variant="success">{inv.role}</Badge>
                      {format(new Date(inv.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </div>
                  </div>
                  <InviteDeleteButton inviteId={inv.id} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {used.length > 0 && (
          <Card>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-muted)" }}>Utilizados ({used.length})</h3>
              {used.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl opacity-60" style={{ background: "var(--bg-elevated)" }}>
                  <div>
                    <div className="text-sm font-mono font-bold tracking-widest line-through">{inv.code}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Badge>{inv.role}</Badge>
                      {format(new Date(inv.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </div>
                  </div>
                  <InviteDeleteButton inviteId={inv.id} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {invites.length === 0 && (
          <Card className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay códigos de invitación todavía.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
