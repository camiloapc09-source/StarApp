import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PlayerPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/login");
  redirect("/dashboard/player");
}
