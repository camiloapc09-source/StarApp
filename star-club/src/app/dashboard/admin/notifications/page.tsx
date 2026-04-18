import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/dict";
import NotificationsClient from "@/components/notifications-client";
import SendNotificationForm from "@/components/admin/send-notification-form";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const dict = await getDictionary();

  return (
    <div>
      <Header
        title={dict.notifications?.title ?? "Notificaciones"}
        subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al dia"}
      />
      <div className="p-8 space-y-6">
        <Card className="p-6">
          <SendNotificationForm />
        </Card>
        <NotificationsClient
          initial={notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

