interface HeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl"
      style={{
        background: "rgba(7,7,26,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="px-8 py-4">
        <h1
          className="text-lg font-black tracking-tight leading-none"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5 tracking-wide" style={{ color: "rgba(255,255,255,0.28)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
