import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ProfileEditForm from "@/components/profile-edit-form";
import AvatarUpload from "@/components/profile/avatar-upload";
import ChangePasswordForm from "@/components/profile/change-password-form";
import { calculateLevel, LEVEL_TITLES } from "@/lib/utils";
import { Zap, Shield } from "lucide-react";

export default async function PlayerProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true,
      emergencyContact: true, eps: true, avatar: true,
      avatarPending: true, avatarStatus: true, role: true,
      playerProfile: {
        select: {
          id: true, address: true, position: true,
          jerseyNumber: true, dateOfBirth: true,
          documentNumber: true, xp: true, level: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  // Fetch jersey numbers already taken by other players
  const takenJerseys = await db.player.findMany({
    where: { NOT: { userId: session.user.id }, jerseyNumber: { not: null } },
    select: { jerseyNumber: true },
  });
  const takenJerseyNumbers = takenJerseys.map((p) => p.jerseyNumber as number);

  const level = calculateLevel(user.playerProfile?.xp ?? 0);
  const levelTitle = LEVEL_TITLES[level] ?? "";

  return (
    <div>
      <Header title="Mi perfil" subtitle="Gestiona tu información personal" />
      <div className="p-8 space-y-6 max-w-2xl">
        {/* Avatar header */}
        <Card>
          <AvatarUpload
            currentAvatar={user.avatar ?? null}
            pendingAvatar={user.avatarPending ?? null}
            avatarStatus={user.avatarStatus}
            userName={user.name}
          />
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {user.playerProfile?.category?.name ?? "Sin categoría"}
              {user.playerProfile?.jerseyNumber ? ` · #${user.playerProfile.jerseyNumber}` : ""}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>
                <Zap size={12} /> {user.playerProfile?.xp ?? 0} XP
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <Shield size={12} /> Nivel {level} · {levelTitle}
              </span>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <Card>
          <ProfileEditForm
            takenJerseyNumbers={takenJerseyNumbers}
            profile={{
              name: user.name,
              email: user.email,
              phone: user.phone,
              emergencyContact: user.emergencyContact,
              eps: user.eps,
              role: user.role,
              playerProfile: user.playerProfile
                ? {
                    address: user.playerProfile.address,
                    position: user.playerProfile.position,
                    jerseyNumber: user.playerProfile.jerseyNumber,
                    dateOfBirth: user.playerProfile.dateOfBirth?.toISOString() ?? null,
                    documentNumber: user.playerProfile.documentNumber,
                  }
                : null,
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
