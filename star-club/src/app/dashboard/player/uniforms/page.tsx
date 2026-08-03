import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { UniformsView } from "@/components/uniforms/uniforms-view";
import { playerSurnames } from "@/lib/uniforms";

export default async function PlayerUniformsPage() {
  const session = await auth();
  // Un COACH con perfil de deportista también pide sus uniformes acá.
  const isCoachPlayer = session?.user?.role === "COACH";
  if (!session?.user || (session.user.role !== "PLAYER" && !(isCoachPlayer && session.user.linkedPlayerId))) redirect("/");

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });

  if (!player) {
    return (
      <div>
        <Header title="Uniformes" subtitle="Solicitar uniformes del club" />
        <div className="p-4 md:p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>Tu cuenta no está vinculada a un perfil de deportista.</p>
        </div>
      </div>
    );
  }

  const players = [{
    id: player.id,
    name: player.user.name,
    surnames: playerSurnames(player.user.name),
  }];

  const orders = await db.uniformOrder.findMany({
    where: { playerId: player.id },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Header title="Uniformes" subtitle="Solicita tu uniforme del club" />
      <UniformsView players={players} orders={orders} />
    </div>
  );
}
