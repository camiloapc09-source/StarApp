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
  try {
    const [count, club] = await Promise.all([
      db.notification.count({ where: { userId: session.user.id, isRead: false } }),
      db.club.findUnique({ where: { id: session.user.clubId }, select: { name: true, logo: true, plan: true } }),
    ]);
    unreadCount = count;
    if (club) { clubName = club.name; clubLogo = club.logo; clubPlan = club.plan; }
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
    >
      {children}
    </DashboardShell>
  );
}
