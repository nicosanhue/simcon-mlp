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

interface ChartData {
  title: string;
  data: StatusData[];
}

interface MultipleStatusChartsProps {
  charts: ChartData[];
  mainTitle: string;
}

function MiniPieChart({ title, data }: ChartData) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as StatusData;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg max-h-[250px] overflow-y-auto min-w-[180px]">
          <p className="font-medium text-foreground text-xs">{item.name}</p>
          <p className="text-xs text-muted-foreground mb-1">
            {item.value} equipos ({percentage}%)
          </p>
          {item.equipment && item.equipment.length > 0 && (
            <div className="border-t border-border pt-1 space-y-0.5">
              {item.equipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
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
        <tspan x={cx} y={cy - 5} className="text-xl font-bold fill-foreground">
          {total}
        </tspan>
        <tspan x={cx} y={cy + 12} className="text-[10px] fill-muted-foreground">
          Total
        </tspan>
      </text>
    );
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-sm font-medium text-foreground mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-medium text-foreground mb-1 text-center truncate w-full" title={title}>
        {title}
      </p>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
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
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MultipleStatusCharts({ charts, mainTitle }: MultipleStatusChartsProps) {
  const gridCols = charts.length <= 2 ? 'grid-cols-2' : 
                   charts.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' : 
                   'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="industrial-panel p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{mainTitle}</h3>
      <div className={`grid ${gridCols} gap-4`}>
        {charts.map((chart, index) => (
          <div key={index} className="p-3 bg-muted/30 rounded-lg">
            <MiniPieChart {...chart} />
          </div>
        ))}
      </div>
    </div>
  );
}
