import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import CreateSessionForm from "@/components/coach/create-session-form";
import Link from "next/link";

export default async function AdminNewSessionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const categories = await db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } });

  return (
    <div>
      <Header title="Nueva sesión" subtitle="Crea un entrenamiento, partido o evento" />
      <div className="p-8 max-w-lg space-y-4">

        <Link
          href="/dashboard/admin/attendance"
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} /> Volver a Asistencia
        </Link>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <CalendarPlus size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold">Crear sesión</h2>
          </div>
          <CreateSessionForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            userRole="ADMIN"
          />
        </Card>
      </div>
    </div>
  );
}
