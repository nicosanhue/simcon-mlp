import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  useStcStations,
  useStcSpools,
  useStcReadings,
  useUpdateReading,
  useAddWeek,
  type StcSpool,
  type StcReading,
} from "@/hooks/useStcData";
import { getStcStatus } from "@/lib/stcStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowDown, ArrowUp, ChevronDown, Minus, Plus, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomChartsSection } from "@/components/stc/CustomChartsSection";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

function DeltaCell({
  reading,
  onSave,
}: {
  reading: StcReading | undefined;
  onSave: (v: number | null) => void;
}) {
  const [val, setVal] = useState<string>(
    reading?.delta_t !== null && reading?.delta_t !== undefined
      ? String(reading.delta_t)
      : "",
  );
  const status = getStcStatus(reading?.delta_t ?? null);
  return (
    <Input
      type="number"
      step="0.1"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const trimmed = val.trim();
        const parsed = trimmed === "" ? null : Number(trimmed);
        const current = reading?.delta_t ?? null;
        if (parsed === current) return;
        if (parsed !== null && Number.isNaN(parsed)) return;
        onSave(parsed);
      }}
      className={cn(
        "h-8 w-20 text-center text-sm",
        reading?.delta_t !== null && reading?.delta_t !== undefined && status.bgClass,
      )}
    />
  );
}

export default function StcTemperatura() {
  const stations = useStcStations().data ?? [];
  const spools = useStcSpools().data ?? [];
  const readings = useStcReadings().data ?? [];
  const updateReading = useUpdateReading();
  const addWeek = useAddWeek();
  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [openStations, setOpenStations] = useState<Record<string, boolean>>({});

  const allWeeks = useMemo(() => {
    const set = new Map<string, { week: number; year: number }>();
    readings.forEach((r) => {
      const k = `${r.year}-${r.week_number}`;
      if (!set.has(k)) set.set(k, { week: r.week_number, year: r.year });
    });
    return Array.from(set.values()).sort(
      (a, b) => b.year - a.year || b.week - a.week,
    );
  }, [readings]);

  const latest = allWeeks[0];
  const prev = allWeeks[1];
  const visibleWeeks = showAll ? allWeeks : allWeeks.slice(0, 3);

  const readingsIndex = useMemo(() => {
    const m = new Map<string, Map<string, StcReading>>();
    readings.forEach((r) => {
      if (!m.has(r.spool_id)) m.set(r.spool_id, new Map());
      m.get(r.spool_id)!.set(`${r.year}-${r.week_number}`, r);
    });
    return m;
  }, [readings]);

  const spoolsByStation = useMemo(() => {
    const m = new Map<string, StcSpool[]>();
    spools.forEach((s) => {
      if (!m.has(s.station_id)) m.set(s.station_id, []);
      m.get(s.station_id)!.push(s);
    });
    m.forEach((arr) => arr.sort((a, b) => a.order_index - b.order_index));
    return m;
  }, [spools]);

  const stationMax = (stationId: string, week?: { week: number; year: number }) => {
    if (!week) return 0;
    const arr = spoolsByStation.get(stationId) ?? [];
    let max = 0;
    arr.forEach((sp) => {
      const r = readingsIndex.get(sp.id)?.get(`${week.year}-${week.week}`);
      const v = r?.delta_t ?? 0;
      if (v > max) max = v;
    });
    return max;
  };

  // Trend: compare spool-by-spool between latest and prev.
  const stationTrend = (stationId: string): "up" | "down" | "flat" => {
    if (!latest || !prev) return "flat";
    const arr = spoolsByStation.get(stationId) ?? [];
    let anyUp = false;
    let anyDown = false;
    for (const sp of arr) {
      const cur = readingsIndex.get(sp.id)?.get(`${latest.year}-${latest.week}`)?.delta_t ?? 0;
      const pre = readingsIndex.get(sp.id)?.get(`${prev.year}-${prev.week}`)?.delta_t ?? 0;
      const diff = cur - pre;
      if (diff >= 0.5) anyUp = true;
      else if (diff <= -0.5) anyDown = true;
    }
    if (anyUp) return "up";
    if (anyDown) return "down";
    return "flat";
  };

  const [addWeekNum, setAddWeekNum] = useState<number>(
    latest ? (latest.week === 53 ? 1 : latest.week + 1) : 30,
  );
  const [addYear, setAddYear] = useState<number>(
    latest ? (latest.week === 53 ? latest.year + 1 : latest.year) : new Date().getFullYear(),
  );

  const handleAddWeek = async () => {
    try {
      await addWeek.mutateAsync({
        week_number: addWeekNum,
        year: addYear,
        spool_ids: spools.map((s) => s.id),
      });
      toast.success(`Semana ${addWeekNum}/${addYear} agregada`);
      setAddOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Error al agregar semana");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Thermometer className="h-6 w-6 text-primary" />
              Control Temperatura STC
            </h1>
            <p className="text-sm text-muted-foreground">
              Seguimiento termográfico semanal de spools por estación
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Agregar semana de seguimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva semana de seguimiento</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div>
                  <Label>Semana</Label>
                  <Input
                    type="number"
                    min={1}
                    max={53}
                    value={addWeekNum}
                    onChange={(e) => setAddWeekNum(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Año</Label>
                  <Input
                    type="number"
                    value={addYear}
                    onChange={(e) => setAddYear(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddWeek} disabled={addWeek.isPending}>
                  Crear filas vacías para {spools.length} spools
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary table */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">
            Resumen por Estación {latest && `— Semana ${latest.week}/${latest.year}`}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estación</TableHead>
                <TableHead className="text-right">ΔT máx (°C)</TableHead>
                <TableHead className="text-center">Tendencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((st) => {
                const currMax = stationMax(st.id, latest);
                const status = getStcStatus(currMax);
                const trend = stationTrend(st.id);
                const TrendIcon =
                  trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
                const trendColor =
                  trend === "up"
                    ? "text-status-falla"
                    : trend === "down"
                      ? "text-status-operativo"
                      : "text-muted-foreground";
                return (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.code}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(currMax)}</TableCell>
                    <TableCell>
                      <div className={cn("flex items-center justify-center", trendColor)}>
                        <TrendIcon className="h-4 w-4" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(status.bgClass, status.textClass, "border-0")}
                        variant="outline"
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Charts per station — collapsible group */}
        <Card className="p-4">
          <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full">
                <h2 className="font-semibold">Gráfico por Estación — Línea Principal</h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    chartsOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {stations.map((st) => {
                  const arr = (spoolsByStation.get(st.id) ?? []).filter(
                    (s) => s.branch === "principal",
                  );
                  const chartData = arr.map((sp) => {
                    const r = latest
                      ? readingsIndex.get(sp.id)?.get(`${latest.year}-${latest.week}`)
                      : undefined;
                    const v = r?.delta_t ?? 0;
                    return { tag: sp.tag, delta: v, fill: getStcStatus(v).hex };
                  });
                  return (
                    <Card key={st.id} className="p-4">
                      <h3 className="font-semibold mb-2 text-sm">
                        {st.code} — Línea Principal (ΔT por Spool)
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                              dataKey="tag"
                              angle={-60}
                              textAnchor="end"
                              interval={0}
                              height={60}
                              tick={{ fontSize: 9 }}
                            />
                            <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                            <ReTooltip
                              formatter={(v: number) => [`${Number(v).toFixed(2)} °C`, "ΔT"]}
                            />
                            <ReferenceLine y={2.5} stroke="#eab308" strokeDasharray="3 3" />
                            <ReferenceLine y={3.0} stroke="#f97316" strokeDasharray="3 3" />
                            <ReferenceLine y={3.5} stroke="#ef4444" strokeDasharray="3 3" />
                            <Bar dataKey="delta">
                              {chartData.map((d, i) => (
                                <Cell key={i} fill={d.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Full editable table */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Tabla completa de spools</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-all" className="text-sm">
                Mostrar todas las semanas
              </Label>
              <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
            </div>
          </div>

          <div className="space-y-3">
            {stations.map((st) => {
              const arr = spoolsByStation.get(st.id) ?? [];
              const principal = arr.filter((s) => s.branch === "principal");
              const variable = arr.filter((s) => s.branch === "variable_emergencia");
              const isOpen = !!openStations[st.id];

              const renderRows = (list: StcSpool[]) =>
                list.map((sp) => {
                  const latestR = latest
                    ? readingsIndex.get(sp.id)?.get(`${latest.year}-${latest.week}`)
                    : undefined;
                  const status = getStcStatus(latestR?.delta_t ?? null);
                  return (
                    <TableRow key={sp.id}>
                      <TableCell className="font-mono text-xs">
                        {sp.spool_number ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{sp.tag}</TableCell>
                      {visibleWeeks.map((w) => {
                        const r = readingsIndex.get(sp.id)?.get(`${w.year}-${w.week}`);
                        return (
                          <TableCell key={`${w.year}-${w.week}`}>
                            <DeltaCell
                              reading={r}
                              onSave={(v) =>
                                updateReading.mutate({
                                  spool_id: sp.id,
                                  week_number: w.week,
                                  year: w.year,
                                  delta_t: v,
                                })
                              }
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Badge
                          className={cn(status.bgClass, status.textClass, "border-0")}
                          variant="outline"
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                });

              return (
                <Collapsible
                  key={st.id}
                  open={isOpen}
                  onOpenChange={(v) =>
                    setOpenStations((prev) => ({ ...prev, [st.id]: v }))
                  }
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full py-2 px-3 rounded bg-primary/5 hover:bg-primary/10 border border-primary/20">
                      <span className="font-semibold text-primary">{st.code}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-primary transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead className="min-w-[180px]">TAG</TableHead>
                            {visibleWeeks.map((w) => (
                              <TableHead
                                key={`${w.year}-${w.week}`}
                                className="text-center"
                              >
                                S{w.week}/{w.year}
                              </TableHead>
                            ))}
                            <TableHead>Estado actual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {principal.length > 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={2 + visibleWeeks.length + 1}
                                className="bg-primary/10 font-semibold text-xs uppercase tracking-wide"
                              >
                                Rama Principal
                              </TableCell>
                            </TableRow>
                          )}
                          {renderRows(principal)}
                          {variable.length > 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={2 + visibleWeeks.length + 1}
                                className="bg-muted font-semibold text-xs uppercase tracking-wide"
                              >
                                Rama Variable / Emergencia
                              </TableCell>
                            </TableRow>
                          )}
                          {renderRows(variable)}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </Card>

        {/* Custom charts section */}
        <CustomChartsSection
          stations={stations}
          spools={spools}
          readingsIndex={readingsIndex}
          latest={latest}
        />
      </div>
    </MainLayout>
  );
}
