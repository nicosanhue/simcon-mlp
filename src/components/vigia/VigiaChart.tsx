import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface VigiaChartData {
  kind: "line" | "bar" | "status";
  title: string;
  yLabel?: string;
  data: { x: string; y: number; label?: string }[];
}

const STATUS_LABELS: Record<number, string> = {
  0: "Sin medición",
  1: "Satisfactorio",
  2: "Seguimiento",
  3: "Alerta",
  4: "Crítico",
};

export function VigiaChart({ chart }: { chart: VigiaChartData }) {
  if (!chart?.data?.length) {
    return <p className="text-sm text-muted-foreground">Sin datos para graficar.</p>;
  }
  const isStatus = chart.kind === "status";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-2 text-sm font-semibold text-foreground">{chart.title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === "bar" ? (
            <BarChart data={chart.data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => [v, chart.yLabel ?? "Valor"]} />
              <Bar dataKey="y" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chart.data} margin={{ top: 4, right: 8, left: isStatus ? 30 : -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                domain={isStatus ? [0, 4] : ["auto", "auto"]}
                ticks={isStatus ? [0, 1, 2, 3, 4] : undefined}
                tickFormatter={isStatus ? (v: number) => STATUS_LABELS[v] ?? "" : undefined}
              />
              <Tooltip
                formatter={(v: number) =>
                  isStatus ? [STATUS_LABELS[v] ?? v, "Estado"] : [v, chart.yLabel ?? "Valor"]
                }
              />
              <Line
                type={isStatus ? "stepAfter" : "monotone"}
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
