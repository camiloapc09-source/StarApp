import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { UniformsView } from "@/components/uniforms/uniforms-view";
import { playerSurnames } from "@/lib/uniforms";

export default async function ParentUniformsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
    },
  });

  if (!parent || parent.children.length === 0) {
    return (
      <div>
        <Header title="Uniformes" subtitle="Solicitar uniformes del club" />
        <div className="p-4 md:p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>Tu cuenta no está vinculada a ningún deportista.</p>
        </div>
      </div>
    );
  }

  const players = parent.children.map((c) => ({
    id: c.player.id,
    name: c.player.user.name,
    surnames: playerSurnames(c.player.user.name),
  }));

  const orders = await db.uniformOrder.findMany({
    where: { playerId: { in: players.map((p) => p.id) } },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const subtitle =
    players.length === 1
      ? `Pedidos para ${players[0].name}`
      : `Pedidos para ${players.length} deportistas`;

  return (
    <div>
      <Header title="Uniformes" subtitle={subtitle} />
      <UniformsView players={players} orders={orders} showPlayerName={players.length > 1} />
    </div>
  );
}
