import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

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

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div style={{
        position: "absolute", width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none",
      }} />

      <div className="relative z-10 text-center w-full max-w-2xl">
        {/* Platform brand */}
        <div className="mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)", boxShadow: "0 0 32px rgba(139,92,246,0.40)" }}>
            <span className="text-white font-black text-2xl tracking-tighter">S</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">StarApp</h1>
          <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mt-1">Plataforma Deportiva</p>
          <p className="text-[var(--text-secondary)] mt-3 text-sm max-w-sm mx-auto">
            La plataforma premium para clubes deportivos. Gestiona, registra y potencia a tus deportistas.
          </p>
        </div>

        {/* Club selector */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            Selecciona tu club
          </p>
          <div className="grid gap-3">
            {clubs.map((club) => (
              <Link
                key={club.slug}
                href={`/${club.slug}`}
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] group"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: "var(--bg-elevated)" }}>
                  {club.logo
                    ? <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                    : SPORT_EMOJI[club.sport] ?? "🏆"
                  }
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {club.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {club.sport}{club.city ? ` · ${club.city}` : ""}
                  </p>
                </div>
                <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors text-lg">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          ¿Eres administrador?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">Acceso directo</Link>
        </p>
      </div>
    </main>
  );
}
