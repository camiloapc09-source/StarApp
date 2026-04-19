import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ProfileEditForm from "@/components/profile-edit-form";
import ChangePasswordForm from "@/components/profile/change-password-form";

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
      </div>
    </div>
  );
}
