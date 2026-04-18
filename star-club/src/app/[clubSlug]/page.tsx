import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClubLoginForm } from "./club-login-form";

export default async function ClubLoginPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  const club = await db.club.findUnique({
    where: { slug: clubSlug },
    select: { id: true, name: true, logo: true, sport: true, slug: true },
  });

  if (!club) notFound();

  return <ClubLoginForm club={club} />;
}
