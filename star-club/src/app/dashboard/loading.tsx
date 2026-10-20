// Esqueleto que se muestra mientras carga cualquier pantalla del panel.
// Antes no había ningún estado de carga: la pantalla anterior se quedaba
// congelada hasta que llegaba la nueva y la app se sentía lenta.

function Block({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`shimmer rounded-2xl ${className}`} style={style} />;
}

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Encabezado */}
      <div className="sticky top-0 z-30 px-8 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <Block className="h-5 w-40 rounded-lg" />
      </div>

      <div className="p-4 md:p-8 space-y-5">
        {/* Tarjeta principal */}
        <Block className="h-32 w-full" />

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-24" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>

        {/* Lista */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Block className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Block className="h-3 w-2/5 rounded-md" />
                <Block className="h-3 w-1/4 rounded-md" />
              </div>
              <Block className="h-8 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
