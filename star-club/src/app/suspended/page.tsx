import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { Lock } from "lucide-react";

export const metadata = { title: "Acceso suspendido" };

export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const email = (session.user as { email?: string }).email ?? "";
  // El super admin nunca está suspendido.
  if (isSuperAdminEmail(email)) redirect("/dashboard/admin");

  const club = await db.club.findUnique({
    where: { id: session.user.clubId },
    select: { name: true, active: true },
  });

  // Si el club ya está activo, no tiene sentido esta pantalla.
  if (club?.active) {
    const role = (session.user.role ?? "player").toLowerCase();
    redirect(`/dashboard/${role}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050512" }}>
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center"
        style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(255,71,87,0.12)", border: "2px solid rgba(255,71,87,0.35)" }}
        >
          <Lock size={28} style={{ color: "#ff4757" }} />
        </div>

        <h1 className="text-xl font-black mb-2" style={{ color: "rgba(255,255,255,0.95)" }}>
          Acceso suspendido
        </h1>

        <p className="text-sm leading-relaxed mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          El acceso de <strong style={{ color: "rgba(255,255,255,0.85)" }}>{club?.name ?? "tu club"}</strong> a
          la aplicación se encuentra temporalmente suspendido.
        </p>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
          Para reactivarlo, ponte en contacto con <strong style={{ color: "#A78BFA" }}>StarApp</strong> y
          regulariza el pago de la suscripción.
        </p>

        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
