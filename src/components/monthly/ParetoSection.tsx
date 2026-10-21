import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import type { MonthlyReportData, DiagDetail } from "@/hooks/useMonthlyReport";
import {
  FAILURE_MODES, MONTHS, STATUS_ORDER, normalize, paretoFromModes, buildParetoByComponent,
  buildMonthlyTrend, topBadActors, sortAreaNames,
} from "@/lib/monthlyReport";

const TECNICAS = ["Vibraciones", "Termografía", "Ultrasonido", "Lubricación"];
// Colores por modo, derivados de los tokens del tema (variaciones de matiz).
const MODE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--status-alerta))", "hsl(var(--status-operativo))",
  "hsl(var(--accent-foreground))", "hsl(var(--muted-foreground))",
];
const modeColor = (m: string) => MODE_COLORS[FAILURE_MODES.indexOf(m as any) % MODE_COLORS.length];
const wk = (w: { week: number; year: number }) => `S${w.week}/${w.year}`;

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1">{label}:</span>
      {["all", ...options].map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${value === o ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-accent"}`}>
          {o === "all" ? (label === "Área" ? "Todas las áreas" : "Todas") : o}
        </button>
      ))}
    </div>
  );
}

function DiagTable({ rows }: { rows: DiagDetail[] }) {
  return (
    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card"><tr className="border-b text-left text-muted-foreground">{["Equipo", "Área", "Semana", "Componente", "Condición", "Modos", "Diagnóstico"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>
          {[...rows].sort((a, b) => STATUS_ORDER.indexOf(a.condicion) - STATUS_ORDER.indexOf(b.condicion) || a.tag.localeCompare(b.tag)).map((d, i) => (
            <tr key={i} className="border-b align-top">
              <td className="p-2 font-semibold whitespace-nowrap">{d.tag}<div className="font-normal text-muted-foreground">{d.name}</div></td>
              <td className="p-2">{d.area}</td>
              <td className="p-2 whitespace-nowrap">{wk(d.week)}</td>
              <td className="p-2">{d.componente}</td>
              <td className="p-2">{d.condicion}</td>
              <td className="p-2">{d.modes.join(", ")}</td>
              <td className="p-2 whitespace-pre-line break-words min-w-[280px]">{d.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ParetoSection({ data }: { data: MonthlyReportData }) {
  const [area, setArea] = useState("all");
  const [tec, setTec] = useState("all");
  const [mode, setMode] = useState<string | null>(null);
  const [actor, setActor] = useState<string | null>(null);

  const areas = useMemo(() => [...new Set(data.trendDiagnoses.map((d) => d.area).filter((a) => a !== "—"))].sort(sortAreaNames), [data]);
  const match = (d: DiagDetail) =>
    (area === "all" || d.area === area) && (tec === "all" || normalize(d.tecnica) === normalize(tec));
  const month = useMemo(() => data.diagnoses.filter(match), [data, area, tec]);
  const trendDiags = useMemo(() => data.trendDiagnoses.filter(match), [data, area, tec]);
  const pareto = useMemo(() => paretoFromModes(month.map((d) => d.modes)), [month]);
  const byComp = useMemo(() => (mode ? buildParetoByComponent(month, mode) : []), [month, mode]);
  const trend = useMemo(() => buildMonthlyTrend(trendDiags, data.trendMonths).map((r) => ({ ...r, label: `${MONTHS[Number(r.month.slice(5)) - 1].slice(0, 3)} ${r.month.slice(2, 4)}` })), [trendDiags, data]);
  const trendModes = FAILURE_MODES.filter((m) => trend.some((r) => (r as any)[m]));
  const actors = useMemo(() => topBadActors(month, 10), [month]);
  const classified = month.filter((d) => d.modes.length).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Chips label="Área" options={areas} value={area} onChange={(v) => { setArea(v); setMode(null); setActor(null); }} />
        <Chips label="Técnica" options={TECNICAS} value={tec} onChange={(v) => { setTec(v); setMode(null); setActor(null); }} />
        <p className="text-xs text-muted-foreground">{classified} diagnósticos con falla en el mes. Los textos sin falla descrita (p. ej. "estado satisfactorio") no se cuentan.</p>
      </div>

      {pareto.length ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={pareto.map((p) => ({ ...p, cumPct: Number(p.cumPct.toFixed(1)) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mode" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis yAxisId="l" allowDecimals={false} fontSize={11} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" fontSize={11} />
                <Tooltip />
                <Bar yAxisId="l" dataKey="count" name="Cantidad" fill="hsl(var(--primary))" className="cursor-pointer" onClick={(d: any) => setMode(d?.mode ?? null)} />
                <Line yAxisId="r" dataKey="cumPct" name="% acumulado" stroke="hsl(var(--destructive))" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Haz clic en un modo de falla para ver sus componentes y diagnósticos.</p>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">{["Modo de falla", "Cantidad", "%", "% acumulado"].map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {pareto.map((p) => (
                  <tr key={p.mode} onClick={() => setMode(mode === p.mode ? null : p.mode)}
                    className={`border-b cursor-pointer hover:bg-accent ${mode === p.mode ? "bg-accent font-semibold" : ""}`}>
                    <td className="py-1 pr-3 text-primary hover:underline">{p.mode}</td>
                    <td className="py-1 pr-3">{p.count}</td><td className="py-1 pr-3">{p.pct.toFixed(1)}</td><td className="py-1 pr-3">{p.cumPct.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground italic">Sin diagnósticos con falla para este filtro.</p>}

      {mode && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">{mode} por componente</h3>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cerrar</Button>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <ComposedChart data={byComp.map((r) => ({ ...r, cumPct: Number(r.cumPct.toFixed(1)) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" fontSize={10} interval={0} />
                <YAxis yAxisId="l" allowDecimals={false} fontSize={11} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" fontSize={11} />
                <Tooltip />
                <Bar yAxisId="l" dataKey="count" name="Cantidad" fill={modeColor(mode)} />
                <Line yAxisId="r" dataKey="cumPct" name="% acumulado" stroke="hsl(var(--destructive))" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <DiagTable rows={month.filter((d) => d.modes.includes(mode))} />
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <h3 className="font-semibold text-sm">Tendencia de los últimos {data.trendMonths.length} meses</h3>
        {trendModes.length ? (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {trendModes.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={MODE_COLORS[i % MODE_COLORS.length]} fillOpacity={1 - Math.floor(i / MODE_COLORS.length) * 0.45} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Sin datos en el período.</p>}
      </div>

      <div className="space-y-2 border-t pt-3">
        <h3 className="font-semibold text-sm">Malos actores: top 10 de equipos con más diagnósticos</h3>
        {actors.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-muted-foreground">{["#", "TAG", "Equipo", "Área", "Diagnósticos", "Modos de falla", "Componentes", "Peor condición"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
              <tbody>
                {actors.map((a, i) => (
                  <tr key={a.tag} onClick={() => setActor(actor === a.tag ? null : a.tag)}
                    className={`border-b cursor-pointer hover:bg-accent align-top ${actor === a.tag ? "bg-accent" : ""}`}>
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-mono font-semibold text-primary whitespace-nowrap">{a.tag}</td>
                    <td className="p-2">{a.name}</td><td className="p-2">{a.area}</td>
                    <td className="p-2 font-bold">{a.count}</td>
                    <td className="p-2">{a.modes.join(", ")}</td><td className="p-2">{a.components.join(", ")}</td>
                    <td className="p-2">{a.worst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Sin equipos con diagnósticos para este filtro.</p>}
        {actor && <DiagTable rows={month.filter((d) => d.tag === actor && d.modes.length)} />}
      </div>
    </div>
  );
}
