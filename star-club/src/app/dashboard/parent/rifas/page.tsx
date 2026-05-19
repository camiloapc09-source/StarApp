import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Ticket } from "lucide-react";
import RafflePickForm from "@/components/parent/raffle-pick-form";

export default async function ParentRifasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const [club, raffles] = await Promise.all([
    db.club.findFirst({
      where: { users: { some: { id: session.user.id } } },
      select: { id: true, name: true, logo: true },
    }),
    db.raffle.findMany({
      where: {
        club: { users: { some: { id: session.user.id } } },
        status: { in: ["OPEN", "CLOSED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tickets: {
          select: {
            id: true,
            number: true,
            status: true,
            ownerName: true,
            takenById: true,
            proofUrl: true,
          },
          orderBy: { number: "asc" },
        },
      },
    }),
  ]);

  if (!club) {
    return (
      <div>
        <Header title="Rifas" subtitle="Rifas del club" />
        <div className="p-4 md:p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>No estás vinculado a ningún club.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Rifas"
        subtitle={`${raffles.length} rifa${raffles.length !== 1 ? "s" : ""} activa${raffles.length !== 1 ? "s" : ""}`}
      />
      <div className="p-4 md:p-8 space-y-8 max-w-2xl">
        {raffles.length === 0 && (
          <Card>
            <div className="text-center py-10">
              <Ticket size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No hay rifas activas en este momento.</p>
            </div>
          </Card>
        )}

        {raffles.map((raffle) => (
          <div key={raffle.id} className="space-y-2">
            {raffle.description && (
              <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>{raffle.description}</p>
            )}
            <RafflePickForm
              raffleId={raffle.id}
              tickets={raffle.tickets}
              ticketPrice={raffle.ticketPrice}
              clubLogo={club.logo}
              clubName={club.name}
              raffleName={raffle.title}
              prize={raffle.prize}
              drawDate={raffle.drawDate?.toISOString() ?? null}
              currentUserId={session.user.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
