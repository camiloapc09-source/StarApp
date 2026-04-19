import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ClubSelector } from "@/components/club-selector";

const SPORT_EMOJI: Record<string, string> = {
  BASKETBALL: "🏀",
  VOLLEYBALL: "🏐",
  FOOTBALL: "⚽",
  BASEBALL: "⚾",
  TENNIS: "🎾",
  SWIMMING: "🏊",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user.role ?? "player").toLowerCase();
    redirect(`/dashboard/${role}`);
  }

  const clubs = await db.club.findMany({
    select: { name: true, slug: true, sport: true, logo: true, city: true },
    orderBy: { name: "asc" },
  });

  return <ClubSelector clubs={clubs} sportEmoji={SPORT_EMOJI} />;
}
