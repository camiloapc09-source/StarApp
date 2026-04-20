"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Target, CheckCircle2, Zap, Calendar, Trophy, Star, Flame } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: string;
  status: string;
  progress: number;
  target: number;
}

interface MissionsListProps {
  missions: Mission[];
  className?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: typeof Target }> = {
  DAILY:     { label: "Diaria",   color: "#60A5FA", bg: "rgba(96,165,250,0.12)",   Icon: Calendar },
  WEEKLY:    { label: "Semanal",  color: "#FCD34D", bg: "rgba(252,211,77,0.12)",   Icon: Flame    },
  CHALLENGE: { label: "Reto",     color: "#F87171", bg: "rgba(248,113,113,0.12)",  Icon: Trophy   },
  SPECIAL:   { label: "Especial", color: "#A78BFA", bg: "rgba(167,139,250,0.12)",  Icon: Star     },
};

export function MissionsList({ missions, className }: MissionsListProps) {
  const activeMissions    = missions.filter((m) => m.status === "ACTIVE");
  const completedMissions = missions.filter((m) => m.status === "COMPLETED");

  if (missions.length === 0) {
    return (
      <div className="text-center py-10">
        <Target size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
        <p className="text-sm font-semibold mb-1">Sin misiones asignadas</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
          Tu entrenador te asignará misiones pronto
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {activeMissions.map((mission, i) => {
        const cfg     = TYPE_CONFIG[mission.type] ?? TYPE_CONFIG.DAILY;
        const TypeIcon = cfg.Icon;
        const pct     = mission.target > 1 ? Math.round((mission.progress / mission.target) * 100) : null;

        return (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="p-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-start gap-3">
              {/* Type icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: cfg.bg }}>
                <TypeIcon size={16} style={{ color: cfg.color }} strokeWidth={1.8} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{mission.title}</p>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {mission.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Zap size={11} style={{ color: "#A78BFA" }} />
                    <span className="text-xs font-black" style={{ color: "#A78BFA" }}>+{mission.xpReward}</span>
                  </div>
                </div>

                {/* Progress */}
                {pct !== null && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>
                      <span>{mission.progress} / {mission.target}</span>
                      <span style={{ color: cfg.color }}>{pct}%</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: cfg.color }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Type badge */}
            <div className="mt-2 flex justify-end">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          </motion.div>
        );
      })}

      {completedMissions.length > 0 && (
        <div className="pt-2">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Completadas ({completedMissions.length})
          </p>
          {completedMissions.map((mission) => (
            <div key={mission.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
              style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.10)" }}>
              <CheckCircle2 size={14} style={{ color: "#34D399" }} />
              <span className="text-sm flex-1 line-through" style={{ color: "rgba(255,255,255,0.35)" }}>
                {mission.title}
              </span>
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#34D399" }}>
                <Zap size={10} />{mission.xpReward}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
