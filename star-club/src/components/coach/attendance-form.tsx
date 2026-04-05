"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type Player = { id: string; user: { name: string; avatar?: string | null } };

export default function AttendanceForm({
  sessionId,
  players,
  initialAttendances,
  t,
}: {
  sessionId: string;
  players: Player[];
  initialAttendances: { playerId: string; status: string }[];
  t: any;
}) {
  const initial: Record<string, string> = {};
  (initialAttendances || []).forEach((a) => (initial[a.playerId] = a.status));

  const [statuses, setStatuses] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);

  const statusKeys = Object.keys(t?.attendanceStatus || {
    PRESENT: "Present",
    ABSENT: "Absent",
    LATE: "Late",
    EXCUSED: "Excused",
  });

  async function handleSave() {
    setLoading(true);
    try {
      const attendances = players.map((p) => ({
        playerId: p.id,
        status: statuses[p.id] || "ABSENT",
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, attendances }),
      });
      if (res.ok) {
        alert(t?.attendance?.saved ?? "Attendance saved");
      } else {
        console.error(await res.text());
        alert(t?.attendance?.saveError ?? "Failed to save attendance");
      }
    } catch (e) {
      console.error(e);
      alert(t?.attendance?.saveError ?? "Failed to save attendance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {players.length === 0 ? (
        <Card>
          <div className="p-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {t?.attendance?.noSessions ?? "No players available"}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <Avatar name={p.user.name} src={p.user.avatar ?? undefined} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.user.name}</div>
              </div>

              <div className="w-40">
                <Select
                  value={statuses[p.id] || "ABSENT"}
                  onChange={(e) => setStatuses((s) => ({ ...s, [p.id]: e.target.value }))}
                  options={statusKeys.map((k) => ({ value: k, label: t?.attendanceStatus?.[k] ?? k }))}
                />
              </div>
            </Card>
          ))}

          <div className="pt-2">
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {t?.attendance?.save ?? "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
