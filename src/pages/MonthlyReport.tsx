import { useState } from "react";
import { Download, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { MONTHS, STATUS_ORDER, sortBadRows, type BadSort, type BadSortKey } from "@/lib/monthlyReport";
import { generateMonthlyReportPdf, monthlyFileName } from "@/lib/monthlyReportPdf";
import { getStcStatus } from "@/lib/stcStatus";
import { toast } from "sonner";
import { ParetoSection } from "@/components/monthly/ParetoSection";

const STATUS_CLASS: Record<string, string> = {
  "Crítico": "bg-status-falla text-primary-foreground",
  Alerta: "bg-status-alerta text-foreground",
  Seguimiento: "bg-secondary text-foreground",
  Satisfactorio: "bg-status-operativo text-primary-foreground",
  "Sin medición": "bg-muted text-muted-foreground",
};

function StatusPill({ s }: { s: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[s] || "bg-muted"}`}>{s}</span>;
}
const wk = (w: { week: number; year: number } | null) => (w ? `S${w.week}/${w.year}` : "—");

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="industrial-panel p-4 space-y-3">
      <h2 className="font-semibold text-primary">{n}. {title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows, empty = "Sin registros", widths }: { head: string[]; rows: React.ReactNode[][]; empty?: string; widths?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${widths ? "table-fixed min-w-[900px]" : ""}`}>
        {widths && <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>}
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="text-left p-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((r, i) => (
            <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className={`p-2 ${widths ? "break-words align-top" : ""}`}>{c}</td>)}</tr>
          )) : (
            <tr><td colSpan={head.length} className="p-3 text-center text-muted-foreground italic">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function MonthlyReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [badSort, setBadSort] = useState<BadSort>({ key: "weeks", dir: "desc" });
  const pickSort = (key: BadSortKey) =>
    setBadSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "tag" ? "asc" : "desc" }));
  const { data, isLoading, error } = useMonthlyReport(month, year);
  const years = [now.getFullYear() - 1, now.getFullYear()];

  async function download() {
    if (!data) return;
    try {
      setBusy(true);
      const blob = await generateMonthlyReportPdf(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = monthlyFileName(month, year);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e: any) {
      toast.error("Error PDF: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Reporte mensual</h1>
            <p className="text-muted-foreground text-sm mt-1">Resumen de condición de equipos por mes calendario</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={download} disabled={!data || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Descargar PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="industrial-panel p-8 text-center text-muted-foreground">Cargando reporte...</div>
        ) : error || !data ? (
          <div className="industrial-panel p-8 text-center text-destructive">No se pudo cargar el reporte.</div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Semanas del mes: {data.weeks.map((w) => w.week).join(", ")}</p>

            <Section n={1} title="Resumen del mes">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {STATUS_ORDER.map((s) => (
                  <div key={s} className="rounded-md border p-3 text-center">
                    <div className="text-2xl font-bold">{data.counts[s] || 0}</div>
                    <StatusPill s={s} />
                  </div>
                ))}
              </div>
            </Section>

            <Section n={2} title={`Pareto de categorización de anomalías (${data.diagCount} diagnósticos)`}>
              <ParetoSection data={data} />
            </Section>

            <Section n={3} title="Equipos críticos y en alerta por área, y semanas seguidas en esa condición">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Ordenar por:</span>
                {([["weeks", "Semanas"], ["status", "Estado"], ["since", "Desde"], ["tag", "TAG"]] as [BadSortKey, string][]).map(([k, label]) => (
                  <Button key={k} size="sm" variant={badSort.key === k ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs gap-1" onClick={() => pickSort(k)}>
                    {label}
                    {badSort.key === k && (badSort.dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </Button>
                ))}
              </div>
              {data.byArea.length === 0 && <p className="text-sm text-muted-foreground italic">Sin equipos críticos ni en alerta este mes.</p>}
              {data.byArea.map((a) => (
                <div key={a.area} className="space-y-1">
                  <h3 className="font-medium text-sm">{a.area} <span className="text-muted-foreground">({a.rows.length})</span></h3>
                  <Table
                    head={["Tag", "Equipo", "Sistema", "Estado", "Semanas", "Desde", "Aviso SAP", "OT"]}
                    widths={["12%", "22%", "16%", "10%", "8%", "9%", "13%", "10%"]}
                    rows={sortBadRows(a.rows, badSort).map((r) => [
                      <span className="font-mono text-primary text-xs">{r.tag}</span>, r.name, r.system, <StatusPill s={r.status} />,
                      <b>{r.weeks}</b>, wk(r.since), r.aviso || <span className="text-muted-foreground italic">Sin aviso</span>, r.ot || "—",
                    ])}
                  />
                </div>
              ))}
            </Section>

            <Section n={4} title="Comparación con el mes anterior">
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {["Crítico", "Alerta"].map((s) => {
                  const diff = (data.counts[s] || 0) - (data.prevCounts[s] || 0);
                  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
                  return (
                    <div key={s} className="rounded-md border p-3">
                      <StatusPill s={s} />
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span>{data.prevCounts[s] || 0} → <b>{data.counts[s] || 0}</b></span>
                        <Icon className={`h-4 w-4 ${diff > 0 ? "text-destructive" : diff < 0 ? "text-status-operativo" : "text-muted-foreground"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <h3 className="font-medium text-sm">Empeoraron</h3>
              <Table head={["Tag", "Equipo", "Área", "Antes", "Ahora"]}
                rows={data.worsened.map((r) => [r.tag, r.name, r.area, <StatusPill s={r.from} />, <StatusPill s={r.to} />])} />
              <h3 className="font-medium text-sm">Mejoraron</h3>
              <Table head={["Tag", "Equipo", "Área", "Antes", "Ahora"]}
                rows={data.improved.map((r) => [r.tag, r.name, r.area, <StatusPill s={r.from} />, <StatusPill s={r.to} />])} />
            </Section>

            <Section n={5} title="Equipos que volvieron a fallar">
              <Table head={["Tag", "Equipo", "Área", "Estado", "Semana"]}
                rows={data.relapses.map((r) => [r.tag, r.name, r.area, <StatusPill s={r.status} />, wk(r.week)])} />
            </Section>

            <Section n={6} title="Control de temperatura STC y STR">
              <div className="grid xl:grid-cols-2 gap-4">
                {data.thermo.map((t) => (
                  <div key={t.system} className="space-y-2">
                    <h3 className="font-medium">{t.system.toUpperCase()}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t.weeks.length ? `Semanas publicadas: ${t.weeks.map((w) => w.week).join(", ")}` : "Sin semanas publicadas en el mes"}
                      {" · "}Spools ≥ 2,5 °C: <b>{t.over25}</b>
                    </p>
                    <Table head={["Estación", "ΔT máx", "Spool más caliente", "Estado"]}
                      rows={t.stations.map((s) => {
                        const st = getStcStatus(s.maxDelta);
                        return [s.name || s.code, s.maxDelta.toFixed(2), <span className="font-mono text-xs">{s.tag}</span>,
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${st.bgClass} ${st.textClass}`}>{st.label}</span>];
                      })} />
                    <Table head={["Top 5 spools", "Estación", "ΔT máx"]}
                      rows={t.top.map((x) => [<span className="font-mono text-xs">{x.tag}</span>, x.station, x.delta.toFixed(2)])} />
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
