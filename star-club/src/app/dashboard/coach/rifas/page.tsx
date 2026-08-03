import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RifasBoard } from "@/components/rifas/rifas-board";

export default async function CoachRifasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/");

  return <RifasBoard userId={session.user.id} />;
}
