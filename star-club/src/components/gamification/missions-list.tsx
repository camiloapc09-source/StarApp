"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Target, CheckCircle2, Clock, Zap } from "lucide-react";

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

const typeColors: Record<string, string> = {
  DAILY: "text-info bg-info/10 border-info/20",
  WEEKLY: "text-warning bg-warning/10 border-warning/20",
  CHALLENGE: "text-error bg-error/10 border-error/20",
  SPECIAL: "text-accent bg-accent/10 border-accent/20",
};

export function MissionsList({ missions, className }: MissionsListProps) {
  const activeMissions = missions.filter((m) => m.status === "ACTIVE");
  const completedMissions = missions.filter((m) => m.status === "COMPLETED");

  return (
    <div className={cn("space-y-3", className)}>
      {missions.length === 0 ? (
        <div className="text-center py-8">
          <Target size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No missions assigned yet
          </p>
        </div>
      ) : (
        <>
          {activeMissions.map((mission, i) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl border"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-primary)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{mission.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {mission.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      typeColors[mission.type] || typeColors.DAILY
                    )}
                  >
                    {mission.type}
                  </span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                    <Zap size={12} />
                    <span className="font-bold">+{mission.xpReward}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              {mission.target > 1 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                    <span>{mission.progress} / {mission.target}</span>
                    <span>{Math.round((mission.progress / mission.target) * 100)}%</span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: 4, background: "var(--bg-card)" }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(mission.progress / mission.target) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {completedMissions.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                COMPLETED ({completedMissions.length})
              </p>
              {completedMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center gap-3 p-3 rounded-xl opacity-50"
                >
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                  <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                    {mission.title}
                  </span>
                  <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
                    <Zap size={12} />
                    <span>+{mission.xpReward}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
