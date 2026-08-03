import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RifasBoard } from "@/components/rifas/rifas-board";

export default async function PlayerRifasPage() {
  const session = await auth();
  // Un COACH con perfil de deportista también entra por acá.
  const isCoachPlayer = session?.user?.role === "COACH";
  if (!session?.user || (session.user.role !== "PLAYER" && !(isCoachPlayer && session.user.linkedPlayerId))) redirect("/");

  return <RifasBoard userId={session.user.id} />;
}
