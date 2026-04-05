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
    redirect("/login");
  }

  let unreadCount = 0;
  try {
    unreadCount = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    });
  } catch {
    // DB unavailable — continue without notification count
  }

  return (
    <DashboardShell
      role={session.user.role}
      userName={session.user.name || "User"}
      notificationCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
