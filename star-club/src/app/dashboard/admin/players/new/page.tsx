import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewPlayerForm } from "./new-player-form";

export default async function NewPlayerPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [categories, club] = await Promise.all([
    db.category.findMany({ where: { clubId }, orderBy: { name: "asc" } }),
    db.club.findUnique({ where: { id: clubId }, select: { zonePrices: true } }),
  ]);

  const zonePrices = club?.zonePrices as Record<string, number> | null;

  return <NewPlayerForm categories={categories} zonePrices={zonePrices} />;
}
