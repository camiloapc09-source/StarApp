import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import ClubSettingsForm from "./club-settings-form";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) redirect("/dashboard/admin");

  const unreadNotifications = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return (
    <div>
      <Header
        title="Configuración"
        subtitle="Ajusta los datos y precios de tu club"
        notificationCount={unreadNotifications}
      />
      <div className="p-4 md:p-8 max-w-3xl">
        <ClubSettingsForm club={club} />
      </div>
    </div>
  );
}
