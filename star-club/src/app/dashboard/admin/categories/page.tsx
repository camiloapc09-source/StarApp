import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Tag } from "lucide-react";
import CategoriesManager from "@/components/admin/categories-manager";

export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const categories = await db.category.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
    include: { _count: { select: { players: true } } },
  });

  return (
    <div>
      <Header
        title="Categorías"
        subtitle="Gestiona las categorías del club"
      />
      <div className="p-8">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Tag size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold text-lg">Categorías activas</h2>
            <span
              className="ml-auto text-sm px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {categories.length} categorías
            </span>
          </div>
          <CategoriesManager initialCategories={categories} />
        </Card>
      </div>
    </div>
  );
}
