import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";

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
  try {
    const isCoach = session.user.role === "COACH";
    const [count, club, coachUser] = await Promise.all([
      db.notification.count({ where: { userId: session.user.id, isRead: false } }),
      db.club.findUnique({ where: { id: session.user.clubId }, select: { name: true, logo: true, plan: true, coachCanInvite: true } }),
      isCoach
        ? db.user.findUnique({ where: { id: session.user.id }, select: { canInvite: true } })
        : null,
    ]);
    unreadCount = count;
    if (club) { clubName = club.name; clubLogo = club.logo; clubPlan = club.plan; }
    if (club?.coachCanInvite && coachUser?.canInvite) coachCanInvite = true;
  } catch {
    // DB unavailable — continue without notification count
  }

  return (
    <DashboardShell
      role={session.user.role}
      userName={session.user.name || "User"}
      notificationCount={unreadCount}
      clubName={clubName}
      clubLogo={clubLogo}
      plan={clubPlan}
      coachCanInvite={coachCanInvite}
    >
      {children}
    </DashboardShell>
  );
}
