import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface EquipmentInfo {
  tag: string;
  name: string;
  status: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
  equipment?: EquipmentInfo[];
}

interface StatusPieChartProps {
  data: StatusData[];
  title: string;
}

export function StatusPieChart({ data, title }: StatusPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as StatusData;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-h-[300px] overflow-y-auto min-w-[200px]">
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {item.value} equipos ({percentage}%)
          </p>
          {item.equipment && item.equipment.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              {item.equipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-primary">{eq.tag}</span>
                  <span className="text-muted-foreground truncate">{eq.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy }: any) => {
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} y={cy - 10} className="text-3xl font-bold fill-foreground">
          {total}
        </tspan>
        <tspan x={cx} y={cy + 15} className="text-sm fill-muted-foreground">
          Total
        </tspan>
      </text>
    );
  };

  return (
    <div className="industrial-panel p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={50}
              formatter={(value, entry: any) => {
                const item = data.find(d => d.name === value);
                const percentage = item && total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                return (
                  <span className="text-sm text-foreground">
                    {value}: {item?.value ?? 0} ({percentage}%)
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
