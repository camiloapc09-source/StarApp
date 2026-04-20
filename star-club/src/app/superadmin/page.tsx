import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { db } from "@/lib/db";
import SuperAdminPanel from "./panel";

export default async function SuperAdminPage() {
  const session = await auth();
  const email = (session?.user as { email?: string })?.email ?? "";

  if (!session?.user || !isSuperAdminEmail(email)) redirect("/");

  const [codes, clubs] = await Promise.all([
    db.accessCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.club.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, players: true, sessions: true, payments: true } },
      },
    }),
  ]);

  const clubsData = clubs.map((c) => ({
    id:        c.id,
    name:      c.name,
    slug:      c.slug,
    sport:     c.sport,
    city:      c.city,
    country:   c.country,
    logo:      c.logo,
    createdAt: c.createdAt,
    plan:      c.plan,
    counts: {
      users:    c._count.users,
      players:  c._count.players,
      sessions: c._count.sessions,
      payments: c._count.payments,
    },
  }));

  const codeStats = {
    total:  codes.length,
    unused: codes.filter((c) => !c.usedAt).length,
    used:   codes.filter((c) => !!c.usedAt).length,
  };

  return <SuperAdminPanel initialCodes={codes} codeStats={codeStats} initialClubs={clubsData} />;
}
