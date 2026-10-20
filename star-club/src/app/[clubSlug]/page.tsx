import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClubLoginForm } from "./club-login-form";
import { ClubThemeStyle } from "@/components/club-theme-style";

export default async function ClubLoginPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  const club = await db.club.findUnique({
    where: { slug: clubSlug },
    select: { id: true, name: true, logo: true, sport: true, slug: true, brandPrimary: true, brandSecondary: true, brandBackground: true },
  });

  if (!club) notFound();

  return (
    <>
      <ClubThemeStyle club={club} />
      <ClubLoginForm club={club} />
    </>
  );
}
