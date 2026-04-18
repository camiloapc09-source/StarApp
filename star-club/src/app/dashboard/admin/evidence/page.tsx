import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { FileImage } from "lucide-react";
import AdminEvidencePanel from "@/components/admin/admin-evidence-panel";

export default async function AdminEvidencePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const [pending, recent] = await Promise.all([
    db.evidence.findMany({
      where: { status: "PENDING" },
      include: {
        player: { include: { user: { select: { name: true, avatar: true } } } },
        playerMission: { include: { mission: { select: { title: true, xpReward: true } } } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.evidence.findMany({
      where: { status: { in: ["ACCEPTED", "REJECTED"] } },
      include: {
        player: { include: { user: { select: { name: true, avatar: true } } } },
        playerMission: { include: { mission: { select: { title: true, xpReward: true } } } },
      },
      orderBy: { verifiedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <Header
        title="Evidencias"
        subtitle={`${pending.length} pendiente${pending.length !== 1 ? "s" : ""} de revisión`}
      />
      <div className="p-8 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <FileImage size={18} style={{ color: "var(--warning)" }} />
            <h2 className="font-semibold text-lg">Pendientes de revisión</h2>
            {pending.length > 0 && (
              <span
                className="ml-auto text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: "rgba(255,165,0,0.15)", color: "var(--warning)" }}
              >
                {pending.length}
              </span>
            )}
          </div>
          <AdminEvidencePanel initialPending={pending} initialRecent={recent} />
        </Card>
      </div>
    </div>
  );
}
