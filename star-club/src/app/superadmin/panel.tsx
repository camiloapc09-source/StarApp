"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Key, Plus, Trash2, Copy, Check, Loader2,
  Shield, Activity, Users, Clock, Building2,
  Globe, Trophy, CreditCard, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NovaWordmark } from "@/components/nova-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

const PLANS = ["STARTER", "PRO", "ENTERPRISE"] as const;
type Plan = typeof PLANS[number];

const PLAN_COLOR: Record<Plan, { bg: string; text: string; border: string }> = {
  STARTER:    { bg: "rgba(96,165,250,0.12)",  text: "#93C5FD", border: "rgba(96,165,250,0.25)"  },
  PRO:        { bg: "rgba(139,92,246,0.12)",  text: "#C4B5FD", border: "rgba(139,92,246,0.25)"  },
  ENTERPRISE: { bg: "rgba(251,191,36,0.12)",  text: "#FCD34D", border: "rgba(251,191,36,0.25)"  },
};

const SPORT_EMOJI: Record<string, string> = {
  FOOTBALL:   "⚽",
  BASKETBALL: "🏀",
  VOLLEYBALL: "🏐",
  SWIMMING:   "🏊",
  TENNIS:     "🎾",
  ATHLETICS:  "🏃",
  OTHER:      "🏅",
};

type Code = {
  id: string;
  code: string;
  plan: string;
  notes: string | null;
  usedAt: Date | null;
  usedByClubId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

type ClubData = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  city: string | null;
  country: string;
  logo: string | null;
  createdAt: Date;
  plan: string;
  counts: { users: number; players: number; sessions: number; payments: number };
};

interface Props {
  initialCodes: Code[];
  codeStats: { total: number; unused: number; used: number };
  initialClubs: ClubData[];
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function SuperAdminPanel({ initialCodes, codeStats, initialClubs }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"clubs" | "codes">("clubs");

  return (
    <div className="min-h-screen" style={{ background: "#050512" }}>

      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,10,28,0.95)" }}>
        <div className="flex items-center gap-4">
          <NovaWordmark dark height={28} />
          <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: "#A78BFA" }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: "#A78BFA" }}>
              Super Admin
            </span>
          </div>
        </div>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)" }}
        >
          Actualizar
        </button>
      </div>

      {/* Global stats bar */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {[
          { label: "Clubes activos",   value: initialClubs.length,         icon: Building2, color: "#A78BFA" },
          { label: "Jugadores totales", value: initialClubs.reduce((s, c) => s + c.counts.players, 0), icon: Users, color: "#34D399" },
          { label: "Códigos sin usar", value: codeStats.unused,            icon: Key,       color: "#60A5FA" },
          { label: "Pagos registrados",value: initialClubs.reduce((s, c) => s + c.counts.payments, 0), icon: CreditCard, color: "#FCD34D" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4"
            style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon size={12} style={{ color: s.color }} />
              <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                {s.label}
              </span>
            </div>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-5 flex gap-1 max-w-5xl mx-auto">
        {([
          { key: "clubs", label: "Clubes registrados", icon: Building2 },
          { key: "codes", label: "Códigos de acceso",  icon: Key },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? "rgba(139,92,246,0.15)" : "transparent",
              color:      tab === t.key ? "#C4B5FD" : "rgba(255,255,255,0.40)",
              border:     tab === t.key ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
            }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {tab === "clubs"  && <ClubsTab clubs={initialClubs} />}
        {tab === "codes"  && <CodesTab initialCodes={initialCodes} codeStats={codeStats} />}
      </div>
    </div>
  );
}

// ─── Clubs tab ────────────────────────────────────────────────────────────────

function ClubsTab({ clubs }: { clubs: ClubData[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"ALL" | Plan>("ALL");

  const filtered = clubs.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.slug.includes(q) || (c.city ?? "").toLowerCase().includes(q);
    const matchPlan   = planFilter === "ALL" || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar club, slug o ciudad…"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.90)" }}
        />
        <div className="flex gap-1.5">
          {(["ALL", ...PLANS] as const).map((p) => {
            const c = p !== "ALL" ? PLAN_COLOR[p] : null;
            const active = planFilter === p;
            return (
              <button key={p} onClick={() => setPlanFilter(p)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: active ? (c?.bg ?? "rgba(255,255,255,0.10)") : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? (c?.border ?? "rgba(255,255,255,0.20)") : "rgba(255,255,255,0.08)"}`,
                  color: active ? (c?.text ?? "#ffffff") : "rgba(255,255,255,0.40)",
                }}>
                {p === "ALL" ? "Todos" : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Header row */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_repeat(4,minmax(0,1fr))] gap-4 px-5 py-3 text-[10px] font-bold tracking-wider uppercase"
          style={{ color: "rgba(255,255,255,0.30)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span>Club</span>
          <span>Plan</span>
          <span>Creado</span>
          <span className="text-center">Usuarios</span>
          <span className="text-center">Jugadores</span>
          <span className="text-center">Sesiones</span>
          <span className="text-center">Pagos</span>
        </div>

        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
              No hay clubes registrados todavía
            </div>
          ) : filtered.map((club) => {
            const pc = PLAN_COLOR[club.plan as Plan] ?? PLAN_COLOR.STARTER;
            return (
              <div key={club.id}
                className="px-5 py-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_repeat(4,minmax(0,1fr))] gap-3 md:gap-4 items-center">

                {/* Club name + slug */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    {club.logo
                      ? <img src={club.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                      : (SPORT_EMOJI[club.sport] ?? "🏅")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{club.name}</p>
                    <p className="text-xs font-mono truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                      /{club.slug}
                      {club.city ? ` · ${club.city}` : ""}
                    </p>
                  </div>
                </div>

                {/* Plan */}
                <div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                    {club.plan}
                  </span>
                </div>

                {/* Created */}
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                  <Calendar size={11} className="inline mr-1" />
                  {format(new Date(club.createdAt), "d MMM yyyy", { locale: es })}
                </div>

                {/* Counts */}
                <StatCell value={club.counts.users}    icon={Users}    color="#A78BFA" label="usuarios" />
                <StatCell value={club.counts.players}  icon={Trophy}   color="#34D399" label="jugadores" />
                <StatCell value={club.counts.sessions} icon={Activity} color="#60A5FA" label="sesiones" />
                <StatCell value={club.counts.payments} icon={CreditCard} color="#FCD34D" label="pagos" />
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.20)" }}>
        {filtered.length} de {clubs.length} clubes
      </p>
    </div>
  );
}

function StatCell({ value, icon: Icon, color, label }: { value: number; icon: React.ElementType; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 md:justify-center">
      <Icon size={11} style={{ color }} />
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
      <span className="text-xs md:hidden" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
    </div>
  );
}

// ─── Codes tab ────────────────────────────────────────────────────────────────

function CodesTab({ initialCodes, codeStats }: { initialCodes: Code[]; codeStats: { total: number; unused: number; used: number } }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [codes, setCodes]       = useState<Code[]>(initialCodes);
  const [plan, setPlan]         = useState<Plan>("STARTER");
  const [notes, setNotes]       = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);
  const [filter, setFilter]     = useState<"all" | "unused" | "used">("all");
  const [error, setError]       = useState<string | null>(null);

  const filtered = codes.filter((c) =>
    filter === "unused" ? !c.usedAt :
    filter === "used"   ? !!c.usedAt : true
  );

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/superadmin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan, notes: notes.trim() || undefined,
          quantity,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setCodes((prev) => [...(data as Code[]), ...prev]);
      setNotes("");
      setQuantity(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteCode(id: string) {
    const res = await fetch(`/api/superadmin/access-codes?id=${id}`, { method: "DELETE" });
    if (res.ok) setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.90)",
  };

  return (
    <div className="space-y-6">
      {/* Generate form */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Plus size={15} style={{ color: "#A78BFA" }} />
          <h2 className="font-bold text-[15px]">Generar códigos de acceso</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Plan</label>
            <div className="flex gap-2">
              {PLANS.map((p) => {
                const c = PLAN_COLOR[p];
                const active = plan === p;
                return (
                  <button key={p} onClick={() => setPlan(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? c.bg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? c.border : "rgba(255,255,255,0.08)"}`,
                      color: active ? c.text : "rgba(255,255,255,0.40)",
                    }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Cantidad</label>
            <input type="number" min={1} max={50} value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={inputStyle} />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Notas <span className="font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(opcional)</span>
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Club Estrellas · pagó $150k · WhatsApp 311..."
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={inputStyle} />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Vence <span className="font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(opcional)</span>
            </label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-2.5 mb-4 text-sm"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", color: "#F87171" }}>
            {error}
          </div>
        )}

        <button onClick={generate} disabled={generating}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
          {generating
            ? <><Loader2 size={15} className="animate-spin" /> Generando…</>
            : <><Key size={15} /> Generar {quantity > 1 ? `${quantity} códigos` : "código"}</>}
        </button>
      </div>

      {/* Code list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.07)" }}>

        <div className="flex items-center gap-1 p-4 pb-0">
          {(["all", "unused", "used"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === f ? "rgba(139,92,246,0.15)" : "transparent",
                color: filter === f ? "#C4B5FD" : "rgba(255,255,255,0.40)",
                border: filter === f ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
              }}>
              {f === "all" ? "Todos" : f === "unused" ? "Sin usar" : "Usados"}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            {filtered.length} códigos
          </span>
        </div>

        <div className="divide-y mt-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
              No hay códigos en esta vista
            </div>
          ) : filtered.map((c) => {
            const pc = PLAN_COLOR[c.plan as Plan] ?? PLAN_COLOR.STARTER;
            const isUsed = !!c.usedAt;
            return (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-4" style={{ opacity: isUsed ? 0.55 : 1 }}>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="text-sm font-mono font-bold tracking-wider"
                    style={{ color: isUsed ? "rgba(255,255,255,0.40)" : "#E2D9FF" }}>
                    {c.code}
                  </code>
                  {!isUsed && (
                    <button onClick={() => copy(c.code)}
                      className="p-1 rounded-md transition-all hover:opacity-70"
                      style={{ color: copied === c.code ? "#34D399" : "rgba(255,255,255,0.30)" }}>
                      {copied === c.code ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                  {c.plan}
                </span>

                {c.notes && (
                  <span className="text-xs truncate flex-1 min-w-0 hidden md:block"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {c.notes}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                  {isUsed ? (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "#60A5FA" }}>
                      <Clock size={11} />
                      {c.usedAt ? format(new Date(c.usedAt), "d MMM yyyy", { locale: es }) : ""}
                    </span>
                  ) : c.expiresAt ? (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.30)" }}>
                      Vence {format(new Date(c.expiresAt), "d MMM", { locale: es })}
                    </span>
                  ) : null}

                  {!isUsed && (
                    <button onClick={() => deleteCode(c.id)}
                      className="p-1.5 rounded-lg transition-all hover:opacity-70"
                      style={{ color: "rgba(239,68,68,0.50)" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
