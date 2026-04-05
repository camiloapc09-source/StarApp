import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ProfileEditForm from "@/components/profile-edit-form";
import ChangePasswordForm from "@/components/profile/change-password-form";
import { CalendarDays, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function CoachProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/login");

  const [user, sessionCount, playerCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, phone: true,
        emergencyContact: true, eps: true, avatar: true, role: true,
        createdAt: true,
      },
    }),
    db.session.count({ where: { coachId: session.user.id } }),
    db.player.count({
      where: {
        attendances: {
          some: { session: { coachId: session.user.id } },
        },
      },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div>
      <Header title="Mi perfil" subtitle="Gestiona tu información de contacto" />
      <div className="p-8 space-y-6 max-w-2xl">

        {/* Identity card */}
        <Card>
          <div className="flex items-center gap-5">
            <Avatar name={user.name} src={user.avatar} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{user.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                Entrenador
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Miembro desde {format(new Date(user.createdAt), "MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)" }}
            >
              <CalendarDays size={16} style={{ color: "var(--accent)" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sesiones</p>
                <p className="font-bold">{sessionCount}</p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)" }}
            >
              <Users size={16} style={{ color: "var(--accent)" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Jugadores únicos</p>
                <p className="font-bold">{playerCount}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <Card>
          <h3 className="font-semibold mb-5">Editar información</h3>
          <ProfileEditForm
            profile={{
              name: user.name,
              email: user.email ?? "",
              phone: user.phone ?? null,
              emergencyContact: user.emergencyContact ?? null,
              eps: user.eps ?? null,
              role: "COACH",
              playerProfile: null,
              parentProfile: null,
            }}
          />
        </Card>

        {/* Change password */}
        <Card>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
