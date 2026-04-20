"use client";

import { useState } from "react";
import { Zap, Target, Plus, CheckCircle2, X, Sparkles, RefreshCw, PenLine } from "lucide-react";

type Player  = { id: string; name: string; xp: number };
type Mission = { id: string; title: string; xpReward: number; type: string };

type Props = { players: Player[]; missions: Mission[]; showCustomTab?: boolean };

type GeneratedMission = {
  title: string;
  description: string;
  xpReward: number;
  type: string;
  icon: string;
  location: string;
};

export default function GamificationActions({ players, missions: initialMissions, showCustomTab = false }: Props) {
  const [tab, setTab] = useState<"mission" | "xp" | "generate" | "custom">("mission");

  // Assign mission
  const [playerId, setPlayerId] = useState("");
  const [assignAll, setAssignAll] = useState(false);
  const [missionId, setMissionId] = useState("");
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionMsg, setMissionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Award XP
  const [xpPlayerId, setXpPlayerId] = useState("");
  const [xpAmount, setXpAmount] = useState(50);
  const [xpReason, setXpReason] = useState("");
  const [xpLoading, setXpLoading] = useState(false);
  const [xpMsg, setXpMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Generate mission with AI (location sent as default to API)
  const genLocation = "gym";
  const [genLoading, setGenLoading] = useState(false);
  const [genMission, setGenMission] = useState<GeneratedMission | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Custom mission (coach-only)
  const [customPlayerId, setCustomPlayerId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customXp, setCustomXp] = useState(50);
  const [customType, setCustomType] = useState("CHALLENGE");
  const [customLoading, setCustomLoading] = useState(false);
  const [customMsg, setCustomMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function assignMission(e: React.FormEvent) {
    e.preventDefault();
    if (!missionId) return;
    if (!assignAll && !playerId) return;
    setMissionLoading(true);
    setMissionMsg(null);
    const body = assignAll
      ? { action: "assign-mission", playerIds: players.map((p) => p.id), missionId }
      : { action: "assign-mission", playerId, missionId };
    const res = await fetch("/api/gamification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      const count = d.assigned ?? 1;
      setMissionMsg({ ok: true, text: assignAll ? `¡Misión asignada a ${count} jugadores!` : "¡Misión asignada!" });
      setPlayerId("");
      setMissionId("");
      setAssignAll(false);
    } else {
      const d = await res.json();
      setMissionMsg({ ok: false, text: d.error ?? "Error al asignar" });
    }
    setMissionLoading(false);
    setTimeout(() => setMissionMsg(null), 3500);
  }

  async function awardXP(e: React.FormEvent) {
    e.preventDefault();
    setXpLoading(true);
    setXpMsg(null);
    const res = await fetch("/api/gamification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "award-xp", playerId: xpPlayerId, xp: xpAmount, reason: xpReason || undefined }),
    });
    if (res.ok) {
      setXpMsg({ ok: true, text: `+${xpAmount} XP otorgados.` });
      setXpPlayerId("");
      setXpAmount(50);
      setXpReason("");
    } else {
      const d = await res.json();
      setXpMsg({ ok: false, text: d.error ?? "Error" });
    }
    setXpLoading(false);
    setTimeout(() => setXpMsg(null), 3000);
  }

  async function generateMission() {
    setGenLoading(true);
    setGenMission(null);
    setCreateMsg(null);
    const res = await fetch(`/api/missions/generate?location=${genLocation}`);
    if (res.ok) setGenMission(await res.json());
    setGenLoading(false);
  }

  async function createGeneratedMission() {
    if (!genMission) return;
    setCreateLoading(true);
    setCreateMsg(null);
    const res = await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: genMission.title,
        description: genMission.description,
        xpReward: genMission.xpReward,
        type: genMission.type,
        icon: genMission.icon,
      }),
    });
    if (res.ok) {
      setCreateMsg({ ok: true, text: "¡Misión creada y disponible en el sistema!" });
      setGenMission(null);
    } else {
      const d = await res.json();
      setCreateMsg({ ok: false, text: d.error ?? "Error al crear" });
    }
    setCreateLoading(false);
    setTimeout(() => setCreateMsg(null), 4000);
  }

  async function createAndAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!customPlayerId || !customTitle.trim()) return;
    setCustomLoading(true);
    setCustomMsg(null);
    const res = await fetch("/api/gamification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-and-assign",
        playerId: customPlayerId,
        title: customTitle.trim(),
        xpReward: customXp,
        type: customType,
      }),
    });
    if (res.ok) {
      setCustomMsg({ ok: true, text: "¡Misión personalizada asignada!" });
      setCustomPlayerId("");
      setCustomTitle("");
      setCustomXp(50);
    } else {
      const d = await res.json();
      setCustomMsg({ ok: false, text: d.error ?? "Error" });
    }
    setCustomLoading(false);
    setTimeout(() => setCustomMsg(null), 3500);
  }

  const selectCls = "w-full rounded-xl px-4 py-3 text-sm outline-none border";
  const selectStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
        {([
          { id: "mission", label: "Asignar misión", icon: <Target size={13} /> },
          { id: "xp",      label: "Otorgar XP",     icon: <Zap size={13} /> },
          { id: "generate",label: "Generar con IA",  icon: <Sparkles size={13} /> },
          ...(showCustomTab ? [{ id: "custom" as const, label: "Personalizada", icon: <PenLine size={13} /> }] : []),
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={tab === t.id
              ? { background: "var(--bg-secondary)", color: "var(--text-primary)" }
              : { color: "var(--text-muted)" }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 🎯 Assign Mission 🎯 */}
      {tab === "mission" && (
        <form onSubmit={assignMission} className="space-y-3">
          {/* Assign-all toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => { setAssignAll((v) => !v); setPlayerId(""); }}
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: assignAll ? "var(--accent)" : "var(--border-primary)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: assignAll ? "translateX(20px)" : "translateX(2px)" }}
              />
            </div>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {assignAll ? `Todos los jugadores activos (${players.length})` : "Jugador específico"}
            </span>
          </label>

          {!assignAll && (
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required={!assignAll} className={selectCls} style={selectStyle}>
              <option value="">Selecciona un jugador</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.xp} XP)</option>
              ))}
            </select>
          )}

          <select value={missionId} onChange={(e) => setMissionId(e.target.value)} required className={selectCls} style={selectStyle}>
            <option value="">Selecciona una misión</option>
            {initialMissions.map((m) => (
              <option key={m.id} value={m.id}>{m.title} (+{m.xpReward} XP)</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={missionLoading || !missionId || (!assignAll && !playerId)}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--info)", color: "#fff" }}
          >
            <Plus size={14} /> {missionLoading ? "Asignando..." : assignAll ? `Asignar a todos (${players.length})` : "Asignar misión"}
          </button>
          {missionMsg && (
            <p className="text-sm text-center font-medium flex items-center justify-center gap-1.5"
               style={{ color: missionMsg.ok ? "var(--success)" : "var(--error)" }}>
              {missionMsg.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
              {missionMsg.text}
            </p>
          )}
        </form>
      )}

      {/* ⭐ Award XP ⭐ */}
      {tab === "xp" && (
        <form onSubmit={awardXP} className="space-y-3">
          <select value={xpPlayerId} onChange={(e) => setXpPlayerId(e.target.value)} required className={selectCls} style={selectStyle}>
            <option value="">Selecciona un jugador</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.xp} XP)</option>
            ))}
          </select>
          <div className="flex gap-3">
            <input
              type="number" min={1} max={1000} value={xpAmount}
              onChange={(e) => setXpAmount(Number(e.target.value))}
              required placeholder="XP"
              className="w-28 rounded-xl px-4 py-3 text-sm outline-none border"
              style={selectStyle}
            />
            <input
              value={xpReason} onChange={(e) => setXpReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border"
              style={selectStyle}
            />
          </div>
          <button
            type="submit"
            disabled={xpLoading || !xpPlayerId}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <Zap size={14} /> {xpLoading ? "Otorgando..." : `Otorgar ${xpAmount} XP`}
          </button>
          {xpMsg && (
            <p className="text-sm text-center font-medium flex items-center justify-center gap-1.5"
               style={{ color: xpMsg.ok ? "var(--success)" : "var(--error)" }}>
              {xpMsg.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
              {xpMsg.text}
            </p>
          )}
        </form>
      )}

      {/* ✨ Generate with AI ✨ */}
      {tab === "generate" && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Genera una misión de entrenamiento físico en español (abdominales, carreras, saltos, etc.) que se pueda realizar en cualquier lugar.
          </p>
          <button
            type="button"
            disabled={genLoading}
            onClick={generateMission}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-primary)" }}
          >
            {genLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {genLoading ? "Generando..." : "Generar misión"}
          </button>

          {genMission && (
            <div className="rounded-xl p-4 space-y-3 border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{genMission.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{genMission.title}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{genMission.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent)", color: "#000" }}>
                      +{genMission.xpReward} XP
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                      {genMission.type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={generateMission}
                  disabled={genLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                >
                  <RefreshCw size={11} className="inline mr-1" />Otra misión
                </button>
                <button
                  type="button"
                  onClick={createGeneratedMission}
                  disabled={createLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--info)", color: "#fff" }}
                >
                  {createLoading ? "Creando..." : "✅S Agregar al sistema"}
                </button>
              </div>
            </div>
          )}

          {createMsg && (
            <p className="text-sm text-center font-medium flex items-center justify-center gap-1.5"
               style={{ color: createMsg.ok ? "var(--success)" : "var(--error)" }}>
              {createMsg.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
              {createMsg.text}
            </p>
          )}
        </div>
      )}

      {/* 🎯 Custom mission (coach assigns to specific player) */}
      {tab === "custom" && (
        <form onSubmit={createAndAssign} className="space-y-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Crea una misión exclusiva para un jugador. No aparece en el catálogo global.
          </p>
          <select value={customPlayerId} onChange={(e) => setCustomPlayerId(e.target.value)} required className={selectCls} style={selectStyle}>
            <option value="">Selecciona un jugador</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.xp} XP)</option>)}
          </select>
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Descripción de la misión (ej. Hacer 100 abdominales)"
            required
            className={`w-full ${selectCls}`}
            style={selectStyle}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>XP a otorgar</label>
              <input
                type="number" min={1} max={500} value={customXp}
                onChange={(e) => setCustomXp(Number(e.target.value))}
                className={`w-full ${selectCls}`}
                style={selectStyle}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Tipo</label>
              <select value={customType} onChange={(e) => setCustomType(e.target.value)} className={`w-full ${selectCls}`} style={selectStyle}>
                <option value="CHALLENGE">Reto</option>
                <option value="DAILY">Diaria</option>
                <option value="WEEKLY">Semanal</option>
                <option value="SPECIAL">Especial</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={customLoading || !customPlayerId || !customTitle.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.25)" }}
          >
            <PenLine size={14} /> {customLoading ? "Asignando..." : `Asignar misión personalizada (+${customXp} XP)`}
          </button>
          {customMsg && (
            <p className="text-sm text-center font-medium flex items-center justify-center gap-1.5"
               style={{ color: customMsg.ok ? "var(--success)" : "var(--error)" }}>
              {customMsg.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
              {customMsg.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
