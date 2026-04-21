import { Lock, Zap } from "lucide-react";

interface Props {
  feature: string;
  description: string;
  currentPlan?: string;
}

export default function UpgradeBanner({ feature, description, currentPlan = "STARTER" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(255,184,0,0.10)", border: "1px solid rgba(255,184,0,0.20)" }}
      >
        <Lock size={28} style={{ color: "rgba(255,184,0,0.70)" }} />
      </div>

      <h2 className="text-xl font-black mb-2">{feature}</h2>
      <p className="text-sm max-w-sm mb-1" style={{ color: "var(--text-muted)" }}>{description}</p>
      <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.25)" }}>
        Tu plan actual: <strong className="text-white/50">{currentPlan}</strong>
      </p>

      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.25)",
          color: "#C4B5FD",
        }}
      >
        <Zap size={14} />
        Habla con nosotros para actualizar a PRO
      </div>
    </div>
  );
}
