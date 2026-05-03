import React from "react";
import { calculateLevel, LEVEL_TITLES } from "@/lib/utils";
import { Zap } from "lucide-react";

interface LeaderboardPlayer {
  id: string;
  xp: number;
  user: { name: string };
}

interface Props {
  players: LeaderboardPlayer[];
  currentPlayerId: string;
  /** True global rank of the current player (may be outside the top-20 slice) */
  trueRank?: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const RANK_COLORS = [
  { ring: "#FCD34D", bg: "rgba(252,211,77,0.12)" },
  { ring: "#94A3B8", bg: "rgba(148,163,184,0.10)" },
  { ring: "#FB923C", bg: "rgba(251,146,60,0.10)"  },
];

export function Leaderboard({ players, currentPlayerId, trueRank }: Props) {
  const sorted   = [...players].sort((a, b) => b.xp - a.xp);
  const myIndexInList = sorted.findIndex((p) => p.id === currentPlayerId);
  const myRank   = trueRank ?? (myIndexInList >= 0 ? myIndexInList + 1 : 0);
  // Player is appended after top-20 when trueRank > 20
  const playerIsAppended = myIndexInList >= 20;

  return (
    <div className="space-y-1.5">
      {/* Current player rank summary */}
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
          {sorted.length <= 20 ? sorted.length : "20+"} jugadores
        </p>
        {myRank > 0 && (
          <p className="text-xs font-bold" style={{ color: "#A78BFA" }}>
            Tu posición: #{myRank}
          </p>
        )}
      </div>

      {sorted.map((player, index) => {
        const rank    = trueRank && player.id === currentPlayerId ? trueRank : index + 1;
        const level   = calculateLevel(player.xp);
        const title   = LEVEL_TITLES[level] ?? "";
        const isMe    = player.id === currentPlayerId;
        const medal   = index < 3 ? MEDALS[index] : undefined;
        const colors  = RANK_COLORS[index];

        // Show separator before the appended player
        const showSeparator = playerIsAppended && isMe;

        return (
          <React.Fragment key={player.id}>
          {showSeparator && (
            <div className="flex items-center gap-2 py-1 px-2">
              <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
              <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.20)" }}>···</span>
              <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
            </div>
          )}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
            style={{
              background: isMe
                ? "rgba(139,92,246,0.12)"
                : rank <= 3 ? colors.bg : "rgba(255,255,255,0.02)",
              border: isMe
                ? "1px solid rgba(139,92,246,0.30)"
                : rank <= 3 ? `1px solid ${colors.ring}22` : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {/* Rank */}
            <div className="w-7 flex-shrink-0 text-center">
              {medal ? (
                <span className="text-lg">{medal}</span>
              ) : (
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: isMe ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
                border: isMe ? "1.5px solid rgba(139,92,246,0.50)" : rank <= 3 ? `1.5px solid ${colors.ring}` : "1px solid rgba(255,255,255,0.08)",
                color: isMe ? "#C4B5FD" : "rgba(255,255,255,0.60)",
              }}
            >
              {initials(player.user.name)}
            </div>

            {/* Name + level */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: isMe ? "#C4B5FD" : "rgba(255,255,255,0.88)" }}>
                {player.user.name}
                {isMe && <span className="ml-1.5 text-[10px] font-bold" style={{ color: "#A78BFA" }}>tú</span>}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>
                Nivel {level} · {title}
              </p>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Zap size={11} style={{ color: isMe ? "#A78BFA" : "rgba(255,255,255,0.30)" }} />
              <span className="text-xs font-black" style={{ color: isMe ? "#A78BFA" : "rgba(255,255,255,0.55)" }}>
                {player.xp.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
