"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { STAGE_META, type Stage } from "@/config/constants";

const TICK = { fontSize: 12, fill: "#5f6170" };
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e8e6e1",
  boxShadow: "none",
  fontSize: 12,
};

export function FunnelChart({ data }: { data: { stage: Stage; count: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: STAGE_META[d.stage].label }));
  return (
    <div role="img" aria-label={`Hiring funnel: ${rows.map((r) => `${r.label} ${r.count}`).join(", ")}`} className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#efede8" />
          <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={TICK} width={80} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#f3f1ec" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Applications"]} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22} animationDuration={400}>
            {rows.map((r) => (
              <Cell key={r.stage} fill={STAGE_META[r.stage].color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ApplicationsOverTime({ data }: { data: { day: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div role="img" aria-label={`Applications per day, ${total} in total over ${data.length} days`} className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="appsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7566e8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#7566e8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#efede8" />
          <XAxis
            dataKey="day"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
          />
          <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(d) => format(parseISO(String(d)), "EEE, MMM d")}
            formatter={(v) => [v, "Applications"]}
          />
          <Area type="monotone" dataKey="count" stroke="#7566e8" strokeWidth={2} fill="url(#appsFill)" animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StageDistribution({ data }: { data: { stage: Stage; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.filter((d) => d.count > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        role="img"
        aria-label={`Stage distribution: ${data.map((d) => `${STAGE_META[d.stage].label} ${d.count}`).join(", ")}`}
        className="relative h-52 w-52 shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="count" nameKey="stage" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none" animationDuration={400}>
              {rows.map((r) => (
                <Cell key={r.stage} fill={STAGE_META[r.stage].color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, _n, item) => [v, STAGE_META[(item.payload as { stage: Stage }).stage].label]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-extrabold">{total}</span>
          <span className="text-xs text-muted">applications</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.stage} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_META[d.stage].color }} aria-hidden />
              {STAGE_META[d.stage].label}
            </span>
            <span className="tabular font-semibold">
              {d.count}
              <span className="ml-1.5 font-normal text-muted">{total ? Math.round((d.count / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
