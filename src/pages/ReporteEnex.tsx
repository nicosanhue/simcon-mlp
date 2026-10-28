import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import {
  Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, RefreshCw, Search, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  parseRows, counts, periodDelta, weeklySeries, bySite, latestCritical, heatMatrix,
  STATUSES, type EnexRow, type EnexStatus,
} from "@/lib/enexReport";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enex-report`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const COLOR: Record<Exclude<EnexStatus, "OTRO">, string> = {
  CRITICO: "hsl(var(--status-falla))",
  ALERTA: "hsl(var(--status-alerta))",
  OPERATIVO: "hsl(var(--status-operativo))",
};
const LABEL: Record<Exclude<EnexStatus, "OTRO">, string> = { CRITICO: "Crítico", ALERTA: "Alerta", OPERATIVO: "Operativo" };
const RANGES = [{ v: "30", l: "Últimos 30 días" }, { v: "90", l: "Últimos 90 días" }, { v: "180", l: "Últimos 6 meses" }, { v: "all", l: "Todo" }];

const cssColor = (v: string) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return raw ? `hsl(${raw.replace(/ /g, ", ")})` : "#999";
};
const fmtDate = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;

function StatusBadge({ s }: { s: EnexStatus }) {
  if (s === "CRITICO") return <Badge className="bg-status-falla text-status-falla-foreground hover:bg-status-falla">Crítico</Badge>;
  if (s === "ALERTA") return <Badge className="bg-status-alerta text-status-alerta-foreground hover:bg-status-alerta">Alerta</Badge>;
  return <Badge variant="secondary">{s === "OPERATIVO" ? "Operativo" : "—"}</Badge>;
}

function Kpi({ label, value, prev, color, spark, k, active, onClick }: {
  label: string; value: number; prev: number; color: string; spark: Record<string, number | string>[]; k: string;
  active?: boolean; onClick?: () => void;
}) {
  const diff = value - prev;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  return (
    <Card onClick={onClick}
      className={`cursor-pointer transition-shadow hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-bold tabular-nums text-foreground">{value}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Icon className="h-3 w-3" />{diff > 0 ? "+" : ""}{diff} vs 30 días previos
            </div>
          </div>
          <div className="h-10 w-24">
            <ResponsiveContainer>
              <LineChart data={spark}><Line dataKey={k} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReporteEnex() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [site, setSite] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState("all");
  const [q, setQ] = useState("");
  const [exporting, setExporting] = useState(false);

  const live = useQuery({
    queryKey: ["enex-report"],
    queryFn: async () => {
      const res = await fetch(FN_URL, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      return body as { rows: string[][]; updated: string | null; fetchedAt: string };
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const all = useMemo(() => parseRows(live.data?.rows ?? []), [live.data]);
  const sites = useMemo(() => bySite(all).map((s) => s.site), [all]);
  const maxDate = useMemo(() => all.reduce((m, r) => (r.date > m ? r.date : m), ""), [all]);

  const scoped = useMemo(() => {
    let r: EnexRow[] = all;
    if (site !== "all") r = r.filter((x) => x.site === site);
    if (range !== "all" && maxDate) {
      const d = new Date(maxDate + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - Number(range) + 1);
      const from = d.toISOString().slice(0, 10);
      r = r.filter((x) => x.date >= from);
    }
    return r;
  }, [all, site, range, maxDate]);
  const filtered = useMemo(() => (status === "all" ? scoped : scoped.filter((r) => r.status === status)), [scoped, status]);

  const c = counts(scoped);
  const delta = useMemo(() => periodDelta(site === "all" ? all : all.filter((r) => r.site === site), maxDate || "2000-01-01"), [all, site, maxDate]);
  const weekly = useMemo(() => weeklySeries(filtered), [filtered]);
  const spark = useMemo(() => weeklySeries(scoped).slice(-12), [scoped]);
  const sitesData = useMemo(() => bySite(range === "all" && status === "all" ? all : filtered), [all, filtered, range, status]);
  const critical = useMemo(() => {
    const s = q.trim().toLowerCase();
    return latestCritical(scoped).filter((r) => !s || `${r.tag} ${r.component} ${r.equipment} ${r.site}`.toLowerCase().includes(s));
  }, [scoped, q]);
  const heat = useMemo(() => heatMatrix(scoped), [scoped]);

  const heatOption = useMemo(() => ({
    tooltip: {
      formatter: (p: { value: [number, number, number] }) =>
        `${heat.equipments[p.value[1]]}<br/>Semana ${fmtDate(heat.weeks[p.value[0]])}: ${["", "Operativo", "Alerta", "Crítico"][p.value[2]]}`,
    },
    grid: { left: 170, right: 16, top: 8, bottom: 48 },
    xAxis: { type: "category", data: heat.weeks.map(fmtDate), splitArea: { show: true }, axisLabel: { fontSize: 10 } },
    yAxis: { type: "category", data: heat.equipments, inverse: true, axisLabel: { fontSize: 10, width: 160, overflow: "truncate" } },
    visualMap: {
      type: "piecewise", orient: "horizontal", left: "center", bottom: 0, itemWidth: 12,
      pieces: [
        { value: 1, label: "Operativo", color: cssColor("--status-operativo") },
        { value: 2, label: "Alerta", color: cssColor("--status-alerta") },
        { value: 3, label: "Crítico", color: cssColor("--status-falla") },
      ],
    },
    dataZoom: [{ type: "inside", xAxisIndex: 0 }],
    series: [{ type: "heatmap", data: heat.data, itemStyle: { borderColor: cssColor("--background"), borderWidth: 2, borderRadius: 3 } }],
  }), [heat]);

  async function exportPdf() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: cssColor("--background"), useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = 200, h = (canvas.height * w) / canvas.width;
      const pageH = 287;
      const scale = Math.min(1, pageH / h);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 5 + (w - w * scale) / 2, 5, w * scale, h * scale);
      pdf.save(`Reporte_ENEX_${maxDate || "sin-fecha"}.pdf`);
    } finally { setExporting(false); }
  }

  const hasFilters = site !== "all" || status !== "all" || range !== "all";

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reporte ENEX</h1>
            <p className="text-sm text-muted-foreground">
              Informes de activos críticos MLP · hoja actualizada {live.data?.updated ?? "—"}
              {maxDate && <> · último informe {fmtDate(maxDate)}-{maxDate.slice(0, 4)}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Sitio" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos los sitios</SelectItem>{sites.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos los estados</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{RANGES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setSite("all"); setStatus("all"); setRange("all"); }}><X className="mr-1 h-4 w-4" />Limpiar</Button>}
            <Button variant="outline" size="sm" onClick={() => live.refetch()} disabled={live.isFetching}>
              <RefreshCw className={`mr-1 h-4 w-4 ${live.isFetching ? "animate-spin" : ""}`} />Actualizar
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={exporting || !all.length}><Download className="mr-1 h-4 w-4" />{exporting ? "Generando…" : "Descargar PDF"}</Button>
          </div>
        </div>

        {live.error && <Alert variant="destructive"><AlertDescription>No se pudo leer la hoja de Google: {(live.error as Error).message}</AlertDescription></Alert>}

        {live.isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}<Skeleton className="h-72 md:col-span-4" /></div>
        ) : !all.length ? null : (
          <div ref={reportRef} className="space-y-4 bg-background">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Total informes" value={c.total} prev={delta.prev.total} color="hsl(var(--primary))" spark={spark} k="total" active={status === "all"} onClick={() => setStatus("all")} />
              {STATUSES.map((s) => (
                <Kpi key={s} label={LABEL[s]} value={c[s]} prev={delta.prev[s]} color={COLOR[s]} spark={spark} k={s}
                  active={status === s} onClick={() => setStatus(status === s ? "all" : s)} />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Por sitio y estado</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={sitesData} layout="vertical" margin={{ left: 8, right: 16 }}
                      onClick={(e) => { const s = e?.activeLabel as string | undefined; if (s) setSite(site === s ? "all" : s); }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="site" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {STATUSES.map((s, i) => <Bar key={s} dataKey={s} name={LABEL[s]} stackId="a" fill={COLOR[s]} radius={i === 2 ? [0, 4, 4, 0] : 0} className="cursor-pointer" />)}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader className="pb-2"><CardTitle className="text-base">Evolución semanal</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <AreaChart data={weekly} margin={{ right: 16 }}>
                      <defs>{STATUSES.map((s) => (
                        <linearGradient key={s} id={`g-${s}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLOR[s]} stopOpacity={0.5} /><stop offset="100%" stopColor={COLOR[s]} stopOpacity={0.05} />
                        </linearGradient>
                      ))}</defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="week" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(w) => `Semana del ${fmtDate(String(w))}`} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {STATUSES.map((s) => <Area key={s} type="monotone" dataKey={s} name={LABEL[s]} stackId="1" stroke={COLOR[s]} fill={`url(#g-${s})`} strokeWidth={2} />)}
                      {weekly.length > 8 && <Brush dataKey="week" height={20} tickFormatter={fmtDate} stroke="hsl(var(--primary))" />}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mapa de calor: equipos con problemas repetidos</CardTitle>
                <p className="text-xs text-muted-foreground">Peor condición de cada semana. Arriba, los equipos con más semanas en Alerta o Crítico.</p>
              </CardHeader>
              <CardContent>
                {heat.equipments.length ? (
                  <ReactECharts option={heatOption} notMerge style={{ height: Math.max(220, heat.equipments.length * 22 + 70) }} />
                ) : <p className="py-8 text-center text-sm text-muted-foreground">Sin equipos en Alerta o Crítico en este periodo.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">Equipos críticos y en alerta <span className="font-normal text-muted-foreground">({critical.length})</span></CardTitle>
                <div className="relative w-64" data-html2canvas-ignore>
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar TAG, componente…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="max-h-[480px] overflow-auto p-0">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="px-4 py-2">Estado</th><th className="px-4 py-2">TAG</th><th className="px-4 py-2">Componente</th><th className="px-4 py-2">Equipo</th><th className="px-4 py-2">Sitio</th><th className="px-4 py-2">Último informe</th></tr>
                  </thead>
                  <tbody>
                    {critical.map((r) => (
                      <tr key={r.tag} className="border-t border-border hover:bg-muted/50">
                        <td className="px-4 py-2"><StatusBadge s={r.status} /></td>
                        <td className="px-4 py-2 font-mono font-medium">{r.tag}</td>
                        <td className="px-4 py-2">{r.component.replace(`${r.tag} - `, "")}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.equipment}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.site}</td>
                        <td className="px-4 py-2 tabular-nums">{fmtDate(r.date)}-{r.date.slice(0, 4)}</td>
                      </tr>
                    ))}
                    {!critical.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sin resultados.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
