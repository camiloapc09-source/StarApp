"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="text-center p-8 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <p className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Error al cargar la página
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {error.message || "Ocurrió un error inesperado."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-xl font-semibold text-black"
          style={{ background: "var(--accent)" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
