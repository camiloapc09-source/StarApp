import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ProfileEditForm from "@/components/profile-edit-form";
import ChangePasswordForm from "@/components/profile/change-password-form";
import { Users } from "lucide-react";

export default async function ParentProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true,
      emergencyContact: true, eps: true, avatar: true, role: true,
      parentProfile: { select: { id: true, phone: true, relation: true } },
    },
  });

  if (!user) redirect("/");

  return (
    <div>
      <Header title="Mi perfil" subtitle="Gestiona tu información de contacto" />
      <div className="p-4 md:p-8 space-y-6 max-w-2xl">
        <Card>
          <div className="flex items-center gap-5">
            <Avatar name={user.name} src={user.avatar} size="xl" />
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {user.parentProfile?.relation ?? "Tutor"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <ProfileEditForm
            profile={{
              name: user.name,
              email: user.email,
              phone: user.phone,
              emergencyContact: user.emergencyContact,
              eps: user.eps,
              role: user.role,
              playerProfile: null,
              parentProfile: user.parentProfile ?? null,
            }}
          />
        </Card>

        {/* Change password */}
        <Card>
          <ChangePasswordForm />
        </Card>

        {/* Vincular otro hijo */}
        <div
          className="flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(139,92,246,0.15)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#C4B5FD" }}>
              ¿Tienes otro hijo en el club?
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(196,181,253,0.55)" }}>
              Contacta al administrador del club para que vincule a tu otro hijo a tu cuenta. Una vez vinculado, aparecerá automáticamente en tu panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
