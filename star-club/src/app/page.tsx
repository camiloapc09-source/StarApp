import Link from "next/link";
import getDictionary from "@/lib/dict";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user.role ?? "player").toLowerCase();
    redirect(`/dashboard/${role}`);
  }

  const t = await getDictionary();
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
        {/* Background accent glow */}
        <div
          style={{
            position: "absolute",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] mb-8">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-black font-black text-sm">SC</span>
            </div>
            <span className="font-bold tracking-widest text-sm uppercase text-[var(--text-primary)]">Star Club</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 max-w-4xl leading-none text-[var(--text-primary)]">
          {t.home.headlinePrimary} {" "}
          <span style={{ color: "var(--accent)" }}>{t.home.headlineAccent}</span>
        </h1>

        <p className="text-lg md:text-xl max-w-xl mb-12 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {t.home.heroDescription}
        </p>
        <div className="flex items-center gap-4">
          <Link href="/register" className="px-8 py-3 rounded-xl text-base font-bold transition-all" style={{ background: "var(--accent)", color: "#000" }}>
            {t.home.register}
          </Link>
          <Link href="/login" className="px-8 py-3 rounded-xl text-base font-medium border transition-all" style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}>
            {t.home.signIn}
          </Link>
        </div>

        {/* Feature strip */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-20 text-sm" style={{ color: "var(--text-muted)" }}>
          {["XP y niveles", "Seguimiento de asistencia", "Pagos integrados", "Reportes de rendimiento", "Notificaciones en tiempo real"].map(
            (f) => (
              <span key={f} className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: "var(--accent)" }}
                />
                {f}
              </span>
            )
          )}
        </div>
      </section>
    </main>
  );
}
