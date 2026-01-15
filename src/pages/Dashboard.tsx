import { useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatusPieChart } from "@/components/dashboard/StatusPieChart";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { CriticalAlertsList } from "@/components/dashboard/CriticalAlertsList";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { AreaFilter } from "@/components/dashboard/AreaFilter";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function Dashboard() {
  const currentDate = new Date();
  const [week, setWeek] = useState(getWeekNumber(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedArea, setSelectedArea] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"Falla" | "Alerta" | null>(null);

  const { areas, stats, criticalAlerts, isLoading } = useDashboardData({
    week,
    year,
    areaId: selectedArea,
  });

  // Filter critical alerts based on selected status
  const filteredAlerts = statusFilter 
    ? criticalAlerts.filter(alert => alert.status === statusFilter)
    : criticalAlerts;

  const handleStatusClick = (status: "Falla" | "Alerta") => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  const chartData = [
    { name: "Operativo", value: stats.operativo, color: "hsl(142, 76%, 36%)" },
    { name: "Alerta", value: stats.alerta, color: "hsl(45, 93%, 47%)" },
    { name: "Falla", value: stats.falla, color: "hsl(0, 84%, 60%)" },
    { name: "Stand By", value: stats.standby, color: "hsl(38, 92%, 50%)" },
  ].filter(item => item.value > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo de condición de equipos industriales
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <WeekSelector
              week={week}
              year={year}
              onWeekChange={setWeek}
              onYearChange={setYear}
            />
            <AreaFilter
              areas={areas}
              selectedArea={selectedArea}
              onAreaChange={setSelectedArea}
            />
          </div>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatusCard
              title="Total Equipos"
              value={stats.total}
              subtitle="En sistema"
              icon={<Activity className="h-6 w-6" />}
              variant="default"
            />
            <StatusCard
              title="Operativo"
              value={stats.operativo}
              subtitle={`${stats.total > 0 ? ((stats.operativo / stats.total) * 100).toFixed(0) : 0}% del total`}
              icon={<CheckCircle2 className="h-6 w-6" />}
              variant="success"
            />
            <StatusCard
              title="En Alerta"
              value={stats.alerta}
              subtitle="Requiere monitoreo"
              icon={<AlertTriangle className="h-6 w-6" />}
              variant="warning"
              onClick={() => handleStatusClick("Alerta")}
              isActive={statusFilter === "Alerta"}
            />
            <StatusCard
              title="En Falla"
              value={stats.falla}
              subtitle="Intervención requerida"
              icon={<XCircle className="h-6 w-6" />}
              variant="danger"
              onClick={() => handleStatusClick("Falla")}
              isActive={statusFilter === "Falla"}
            />
            <StatusCard
              title="Stand By"
              value={stats.standby}
              subtitle="Fuera de operación"
              icon={<Clock className="h-6 w-6" />}
              variant="default"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          {isLoading ? (
            <Skeleton className="h-[380px] rounded-lg" />
          ) : (
            <StatusPieChart
              data={chartData}
              title="Distribución de Estados"
            />
          )}

          {/* Critical Alerts */}
          {isLoading ? (
            <Skeleton className="h-[380px] rounded-lg" />
          ) : (
            <CriticalAlertsList alerts={filteredAlerts} activeFilter={statusFilter ?? undefined} />
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
          <p>
            Semana {week} del {year} • {selectedArea === "all" ? "Todas las áreas" : areas.find(a => a.id === selectedArea)?.name}
          </p>
          <p>
            Última actualización: {new Date().toLocaleString("es-CL")}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
