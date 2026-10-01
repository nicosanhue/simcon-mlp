import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon, Search, X } from "lucide-react";
import { getStcStatus } from "@/lib/stcStatus";
import { cn } from "@/lib/utils";
import type {
  StcReading,
  StcSpool,
  StcStation,
  TemperatureSystem,
} from "@/hooks/useStcData";

interface Props {
  stations: StcStation[];
  spools: StcSpool[];
  readingsIndex: Map<string, Map<string, StcReading>>;
  system?: TemperatureSystem;
}

const MAX_RESULTS = 25;
const PRIMARY_HEX = "hsl(var(--primary))";

export function SpoolHistoryChart({
  stations,
  spools,
  readingsIndex,
  system = "stc",
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stationCodeById = useMemo(() => {
    const m = new Map<string, string>();
    stations.forEach((s) => m.set(s.id, s.code));
    return m;
  }, [stations]);

  const selected = selectedId
    ? spools.find((s) => s.id === selectedId) ?? null
    : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as StcSpool[];
    return spools
      .filter((sp) => {
        const code = stationCodeById.get(sp.station_id) ?? "";
        const num = sp.spool_number === null ? "" : String(sp.spool_number);
        return (
          sp.tag.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) ||
          num.toLowerCase().includes(q)
        );
      })
      .slice(0, MAX_RESULTS);
  }, [query, spools, stationCodeById]);

  const series = useMemo(() => {
    if (!selected) return { data: [] as any[], hasTemps: false };
    const inner = readingsIndex.get(selected.id);
    if (!inner) return { data: [] as any[], hasTemps: false };
    const data = Array.from(inner.values())
      .map((r) => ({
        label: `S${r.week_number}/${r.year}`,
        sortKey: r.year * 100 + r.week_number,
        delta: r.delta_t ?? null,
        t_max: r.t_max ?? null,
        t_min: r.t_min ?? null,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
    const hasTemps = data.some((d) => d.t_max !== null || d.t_min !== null);
    return { data, hasTemps };
  }, [selected, readingsIndex]);

  const latestPoint = useMemo(() => {
    for (let i = series.data.length - 1; i >= 0; i--) {
      if (series.data[i].delta !== null) return series.data[i];
    }
    return null;
  }, [series.data]);

  const status = latestPoint ? getStcStatus(latestPoint.delta) : null;
  const systemLabel = system.toUpperCase();

  return (
    <Card className="p-4">
      <h2 className="font-semibold flex items-center gap-2 mb-3">
        <LineChartIcon className="h-5 w-5 text-primary" />
        Graficar Spool
      </h2>

      {spools.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay spools cargados en {systemLabel} para graficar su historial de
          temperatura.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Search + results */}
          <div className="relative max-w-xl">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder="Buscar spool por TAG, estación o número"
              className="pl-9"
              aria-label="Buscar spool"
            />
            {!selected && results.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-background shadow-lg">
                {results.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center justify-between gap-2"
                    onClick={() => {
                      setSelectedId(sp.id);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium text-sm break-all">{sp.tag}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {stationCodeById.get(sp.station_id) ?? "—"}
                      {sp.spool_number !== null ? ` · #${sp.spool_number}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!selected && query.trim() !== "" && results.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No se encontró ningún spool con ese texto.
              </p>
            )}
          </div>

          {/* Selected spool */}
          {selected && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs break-all">
                  {selected.tag}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Estación {stationCodeById.get(selected.station_id) ?? "—"}
                  {selected.spool_number !== null
                    ? ` · Spool #${selected.spool_number}`
                    : ""}
                  {" · "}
                  {selected.branch === "principal" ? "Rama principal" : "Rama variable / emergencia"}
                </span>
                {status && (
                  <Badge
                    className={cn(status.bgClass, status.textClass, "border-0")}
                    variant="outline"
                  >
                    {status.label}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedId(null);
                  setQuery("");
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Quitar
              </Button>
            </div>
          )}

          {/* Chart */}
          {selected &&
            (series.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este spool aún no tiene lecturas registradas.
              </p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={series.data}
                    margin={{ top: 8, right: 12, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                    <ReTooltip
                      formatter={(v: any, name: any) => [
                        `${Number(v).toFixed(2)} °C`,
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={2.5} stroke="#eab308" strokeDasharray="3 3" />
                    <ReferenceLine y={3.0} stroke="#f97316" strokeDasharray="3 3" />
                    <ReferenceLine y={3.5} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="delta"
                      name="ΔT"
                      stroke={PRIMARY_HEX}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                    {series.hasTemps && (
                      <Line
                        type="monotone"
                        dataKey="t_max"
                        name="T máx"
                        stroke="#0ea5e9"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        connectNulls
                      />
                    )}
                    {series.hasTemps && (
                      <Line
                        type="monotone"
                        dataKey="t_min"
                        name="T mín"
                        stroke="#64748b"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
