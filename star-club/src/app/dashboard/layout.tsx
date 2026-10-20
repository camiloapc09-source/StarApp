import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { mightBeSuperAdminEmail } from "@/lib/superadmin";
import { DashboardShell } from "@/components/dashboard/shell";
import { ClubThemeStyle } from "@/components/club-theme-style";
import type { ClubBrand } from "@/lib/club-theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  let unreadCount = 0;
  let clubName = "StarApp";
  let clubLogo: string | null = null;
  let clubPlan = "STARTER";
  let coachCanInvite = false;
  let clubActive = true;
  let clubBrand: ClubBrand | null = null;
  try {
    const isCoach = session.user.role === "COACH";
    const [count, club, coachUser] = await Promise.all([
      db.notification.count({ where: { userId: session.user.id, isRead: false } }),
      db.club.findUnique({ where: { id: session.user.clubId }, select: { name: true, logo: true, plan: true, coachCanInvite: true, active: true, brandPrimary: true, brandSecondary: true, brandBackground: true } }),
      isCoach
        ? db.user.findUnique({ where: { id: session.user.id }, select: { canInvite: true } })
        : null,
    ]);
    unreadCount = count;
    if (club) { clubName = club.name; clubLogo = club.logo; clubPlan = club.plan; clubActive = club.active; clubBrand = club; }
    if (club?.coachCanInvite && coachUser?.canInvite) coachCanInvite = true;
  } catch {
    // DB unavailable — continue without notification count
  }

  // Suscripción suspendida: se bloquea el acceso a la app. El super admin
  // (StarApp) nunca queda bloqueado para poder gestionar y reactivar clubes.
  // El redirect va FUERA del try/catch (redirect() lanza y no debe atraparse).
  const email = (session.user as { email?: string }).email ?? "";
  const isSuperAdmin = mightBeSuperAdminEmail(email);
  if (!clubActive && !isSuperAdmin) {
    redirect("/suspended");
  }

  return (
    <>
    <ClubThemeStyle club={clubBrand} />
    <DashboardShell
      role={session.user.role}
      userName={session.user.name || "User"}
      notificationCount={unreadCount}
      clubName={clubName}
      clubLogo={clubLogo}
      plan={clubPlan}
      coachCanInvite={coachCanInvite}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </DashboardShell>
    </>
  );
}
