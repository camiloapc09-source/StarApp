"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

interface EvidenceItem {
  id: string;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  player: { id: string; user: { id: string; name: string; avatar?: string | null } };
  playerMission: { id: string; mission: { id: string; title: string } };
}

export function EvidencePanel({
  initialEvidences,
  t,
}: {
  initialEvidences: EvidenceItem[];
  t: {
    pendingTitle: string;
    acceptAll: string;
    noPending: string;
    accept: string;
    reject: string;
  };
}) {
  const [items, setItems] = useState<EvidenceItem[]>(initialEvidences || []);
  const [loading, setLoading] = useState(false);

  async function handleAction(id: string, action: "accept" | "reject") {
    setLoading(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (res.ok) {
        setItems((s) => s.filter((it) => it.id !== id));
      } else {
        console.error(await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptAll() {
    if (!confirm(`${t.acceptAll}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acceptAll" }),
      });
      if (res.ok) {
        setItems([]);
      } else {
        console.error(await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>
        {t.noPending}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t.pendingTitle}</h3>
        <Button variant="secondary" size="sm" onClick={handleAcceptAll} disabled={loading}>
          {t.acceptAll}
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((ev) => (
          <Card key={ev.id} className="flex items-start gap-4 p-3">
            <div className="w-20 h-20 rounded overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center">
              <img src={ev.url} alt={ev.filename || "evidence"} className="object-cover w-full h-full" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={ev.player.user.name} src={ev.player.user.avatar} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{ev.player.user.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{ev.playerMission.mission.title}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleAction(ev.id, "reject")} disabled={loading}>
                    {t.reject}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleAction(ev.id, "accept")} disabled={loading}>
                    {t.accept}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default EvidencePanel;
