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

  const unreadCount = await db.notification.count({
    where: {
      userId: session.user.id,
      isRead: false,
    },
  });

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
