import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import NewPaymentForm from "@/components/admin/new-payment-form";

export default async function NewPaymentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const players = await db.player.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <Header title="Nuevo pago" subtitle="Registrar pago manual (efectivo) para un deportista" />
      <div className="p-8 max-w-lg">
        <Card className="p-6">
          <NewPaymentForm
            players={players.map((p) => ({
              id: p.id,
              name: p.user.name,
              paymentDay: p.paymentDay ?? null,
            }))}
            adminName={session.user.name ?? undefined}
          />
        </Card>
      </div>
    </div>
  );
}
