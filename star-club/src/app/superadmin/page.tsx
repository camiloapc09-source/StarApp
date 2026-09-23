import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSuperAdminUser } from "@/lib/superadmin";
import { db } from "@/lib/db";
import SuperAdminPanel from "./panel";

export default async function SuperAdminPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  // Se valida contra la fila real del usuario, no contra su email: los emails
  // son únicos POR CLUB, así que una cuenta con el email del superadmin creada
  // en otro club abría todo el panel de la plataforma.
  if (!session?.user || !userId || !(await isSuperAdminUser(userId))) redirect("/");

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
    id:                 c.id,
    name:               c.name,
    slug:               c.slug,
    sport:              c.sport,
    city:               c.city,
    country:            c.country,
    logo:               c.logo,
    createdAt:          c.createdAt,
    plan:               c.plan,
    active:             c.active,
    suspendedAt:        c.suspendedAt,
    nextPaymentDue:     c.nextPaymentDue,
    subscriptionAmount: c.subscriptionAmount,
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
