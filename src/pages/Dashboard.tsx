import { useState, useEffect, useRef } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Eye, HelpCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatusPieChart } from "@/components/dashboard/StatusPieChart";
import { MultipleStatusCharts } from "@/components/dashboard/MultipleStatusCharts";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { CriticalAlertsList } from "@/components/dashboard/CriticalAlertsList";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { AreaFilter } from "@/components/dashboard/AreaFilter";
import { EquipmentSearch } from "@/components/dashboard/EquipmentSearch";
import { useDashboardData, GroupedStats, DebugCounts } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CriticalReportDownload } from "@/components/reports/CriticalReportDownload";
import { DashboardScreenshotDownload } from "@/components/reports/DashboardScreenshotDownload";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface EquipmentItem {
  tag: string;
  name: string;
  currentStatus: string;
  systems: { id: string; name: string; areas: { id: string; name: string } };
}

function createChartData(stats: { satisfactorio: number; seguimiento: number; alerta: number; critico: number; sinMedicion: number }, equipment?: EquipmentItem[]) {
  const getEquipmentByStatus = (status: string) =>
    equipment?.filter(eq => eq.currentStatus === status).map(eq => ({
      tag: eq.tag,
      name: eq.name,
      status: eq.currentStatus,
    })) || [];

  return [
    { name: "Satisfactorio", value: stats.satisfactorio, color: "hsl(142, 76%, 36%)", equipment: getEquipmentByStatus("Satisfactorio") },
    { name: "Seguimiento", value: stats.seguimiento, color: "hsl(210, 80%, 55%)", equipment: getEquipmentByStatus("Seguimiento") },
    { name: "Alerta", value: stats.alerta, color: "hsl(45, 93%, 47%)", equipment: getEquipmentByStatus("Alerta") },
    { name: "Crítico", value: stats.critico, color: "hsl(0, 84%, 60%)", equipment: getEquipmentByStatus("Crítico") },
    { name: "Sin medición", value: stats.sinMedicion, color: "hsl(220, 9%, 55%)", equipment: getEquipmentByStatus("Sin medición") },
  ].filter(item => item.value > 0);
}

function createGroupedCharts(groupedStats: GroupedStats[], equipment?: EquipmentItem[]) {
  return groupedStats.map((group) => {
    const groupEquipment = equipment?.filter(eq => {
      return eq.systems.areas.name === group.name || eq.systems.name === group.name;
    });
    return {
      title: group.name,
      data: createChartData(group, groupEquipment),
    };
  });
}

export default function Dashboard() {
  const currentDate = new Date();
  const [week, setWeek] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"Crítico" | "Alerta" | "Satisfactorio" | "Seguimiento" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: latestWeekData } = useQuery({
    queryKey: ['latest-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('week_number, year')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  useEffect(() => {
    if (latestWeekData && week === null && year === null) {
      setWeek(latestWeekData.week_number);
      setYear(latestWeekData.year);
    } else if (!latestWeekData && week === null && year === null) {
      setWeek(getWeekNumber(currentDate));
      setYear(currentDate.getFullYear());
    }
  }, [latestWeekData, week, year, currentDate]);

  const { areas, stats, statsByArea, statsBySystem, criticalAlerts, equipment, debugCounts, isLoading } = useDashboardData({
    week: week ?? getWeekNumber(currentDate),
    year: year ?? currentDate.getFullYear(),
    areaId: selectedArea,
    searchTerm,
  });

  // Build alerts list based on filter
  const allAlerts = statusFilter === "Satisfactorio" || statusFilter === "Seguimiento"
    ? equipment
        .filter(eq => eq.currentStatus === statusFilter)
        .map(eq => ({
          id: eq.id,
          tag: eq.tag,
          name: eq.name,
          status: statusFilter as "Satisfactorio" | "Seguimiento",
          area: eq.systems.areas.name,
          system: eq.systems.name,
          description: eq.currentReport?.technical_description || undefined,
          plannedDate: eq.currentReport?.planned_date || undefined,
        }))
    : statusFilter
      ? criticalAlerts.filter(alert => alert.status === statusFilter)
      : criticalAlerts;

  const handleStatusClick = (status: "Crítico" | "Alerta" | "Satisfactorio" | "Seguimiento") => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  const chartData = createChartData(stats, equipment as EquipmentItem[]);
  const areaCharts = createGroupedCharts(statsByArea, equipment as EquipmentItem[]);
  const systemCharts = createGroupedCharts(statsBySystem, equipment as EquipmentItem[]);

  return (
    <MainLayout>
      <div className="space-y-6" ref={dashboardRef}>
        {/* Report Actions */}
        <div className="flex justify-end gap-2">
          <CriticalReportDownload />
          <DashboardScreenshotDownload
            areas={areas}
            currentWeek={week ?? getWeekNumber(currentDate)}
            currentYear={year ?? currentDate.getFullYear()}
            onAreaChange={setSelectedArea}
            dashboardRef={dashboardRef}
          />
        </div>

        {/* Search Bar */}
        <div className="w-full">
          <EquipmentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando resultados para: <span className="font-medium text-foreground">"{searchTerm}"</span>
              {stats.total === 0 && " — Sin resultados encontrados"}
            </p>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo de condiciones de Equipos TFT+ Puerto
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {week !== null && year !== null ? (
              <WeekSelector
                week={week}
                year={year}
                onWeekChange={setWeek}
                onYearChange={setYear}
              />
            ) : (
              <Skeleton className="h-10 w-[250px]" />
            )}
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
              title="Satisfactorio"
              value={stats.satisfactorio}
              subtitle={`${stats.total > 0 ? ((stats.satisfactorio / stats.total) * 100).toFixed(0) : 0}% del total`}
              icon={<CheckCircle2 className="h-6 w-6" />}
              variant="success"
              onClick={() => handleStatusClick("Satisfactorio")}
              isActive={statusFilter === "Satisfactorio"}
            />
            <StatusCard
              title="Seguimiento"
              value={stats.seguimiento}
              subtitle="En seguimiento"
              icon={<Eye className="h-6 w-6" />}
              variant="info"
              onClick={() => handleStatusClick("Seguimiento")}
              isActive={statusFilter === "Seguimiento"}
            />
            <StatusCard
              title="Alerta"
              value={stats.alerta}
              subtitle="Requiere monitoreo"
              icon={<AlertTriangle className="h-6 w-6" />}
              variant="warning"
              onClick={() => handleStatusClick("Alerta")}
              isActive={statusFilter === "Alerta"}
            />
            <StatusCard
              title="Crítico"
              value={stats.critico}
              subtitle="Intervención requerida"
              icon={<XCircle className="h-6 w-6" />}
              variant="danger"
              onClick={() => handleStatusClick("Crítico")}
              isActive={statusFilter === "Crítico"}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isLoading ? (
            <Skeleton className="h-[380px] rounded-lg" />
          ) : selectedArea === "all" ? (
            <div className="space-y-6">
              <StatusPieChart data={chartData} title="Distribución Total" />
              {areaCharts.length > 0 && (
                <MultipleStatusCharts charts={areaCharts} mainTitle="Distribución por Área" />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <StatusPieChart
                data={chartData}
                title={`Distribución - ${areas.find(a => a.id === selectedArea)?.name || 'Área'}`}
              />
              {systemCharts.length > 0 && (
                <MultipleStatusCharts charts={systemCharts} mainTitle="Distribución por Sistema" />
              )}
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-[380px] rounded-lg" />
          ) : (
            <CriticalAlertsList alerts={allAlerts} activeFilter={statusFilter ?? undefined} />
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
          <p>
            Semana {week} del {year} • {selectedArea === "all" ? "Todas las áreas" : areas.find(a => a.id === selectedArea)?.name}
          </p>
          <p>
            Última carga de datos: {latestWeekData ? `Semana ${latestWeekData.week_number} / ${latestWeekData.year}` : "Sin datos"}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
