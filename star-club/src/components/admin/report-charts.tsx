"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Attendance BarChart ────────────────────────────────────────────────────
type AttendancePoint = { month: string; present: number; absent: number; late: number };
export function AttendanceChart({ data }: { data: AttendancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={10}>
        <CartesianGrid vertical={false} stroke="var(--border-primary)" strokeDasharray="4 2" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: 12, fontSize: 12 }}
          itemStyle={{ color: "var(--text-primary)" }}
          cursor={{ fill: "var(--bg-elevated)" }}
        />
        <Bar dataKey="present" name="Presente" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="late"    name="Tarde"    fill="var(--warning)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent"  name="Ausente"  fill="var(--error)"   radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Revenue AreaChart ──────────────────────────────────────────────────────
type RevenuePoint = { month: string; collected: number; pending: number };
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--accent)"  stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--accent)"  stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--warning)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-primary)" strokeDasharray="4 2" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: 12, fontSize: 12 }}
          itemStyle={{ color: "var(--text-primary)" }}
          formatter={(v) => [`$${Number(v).toLocaleString("es-CO")}`, undefined]}
        />
        <Area type="monotone" dataKey="collected" name="Recaudado" stroke="var(--accent)"  strokeWidth={2} fill="url(#gradCollected)" />
        <Area type="monotone" dataKey="pending"   name="Pendiente" stroke="var(--warning)" strokeWidth={2} fill="url(#gradPending)"   />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Payment Status PieChart ────────────────────────────────────────────────
type PaymentSlice = { name: string; value: number; color: string };
export function PaymentPieChart({ data }: { data: PaymentSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: 12, fontSize: 12 }}
          itemStyle={{ color: "var(--text-primary)" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
