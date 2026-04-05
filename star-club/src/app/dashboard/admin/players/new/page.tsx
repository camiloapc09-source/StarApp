import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NewPlayerForm } from "./new-player-form";

export default async function NewPlayerPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return <NewPlayerForm categories={categories} />;
}
