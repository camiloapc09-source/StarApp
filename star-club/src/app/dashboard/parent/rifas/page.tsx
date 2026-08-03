import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RifasBoard } from "@/components/rifas/rifas-board";

export default async function ParentRifasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  return <RifasBoard userId={session.user.id} />;
}
