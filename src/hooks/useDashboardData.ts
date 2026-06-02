import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFilters {
  week: number;
  year: number;
  areaId: string;
  searchTerm?: string;
}

interface EquipmentWithReport {
  id: string;
  tag: string;
  name: string;
  criticality: string;
  systems: {
    id: string;
    name: string;
    areas: {
      id: string;
      name: string;
    };
  };
  currentStatus: string;
  currentReport?: {
    id: string;
    week_number: number;
    year: number;
    status: string;
    sap_notification: string | null;
    sap_order: string | null;
    technical_description: string | null;
    planned_date: string | null;
  };
}

export interface GroupedStats {
  id: string;
  name: string;
  total: number;
  satisfactorio: number;
  seguimiento: number;
  alerta: number;
  critico: number;
  sinMedicion: number;
}

export interface DebugCounts {
  totalEquipment: number;
  totalReports: number;
  reportsInSelectedWeek: number;
}

function calculateStats(equipment: EquipmentWithReport[]) {
  return {
    total: equipment.length,
    satisfactorio: equipment.filter((e) => e.currentStatus === "Satisfactorio").length,
    seguimiento: equipment.filter((e) => e.currentStatus === "Seguimiento").length,
    alerta: equipment.filter((e) => e.currentStatus === "Alerta").length,
    critico: equipment.filter((e) => e.currentStatus === "Crítico").length,
    sinMedicion: equipment.filter((e) => e.currentStatus === "Sin medición").length,
    sinRegistro: equipment.filter((e) => e.currentStatus === "Sin Registro").length,
  };
}

// Helper function to fetch all rows with pagination (bypasses 1000 row limit)
async function fetchAllEquipment(areaId: string, searchTerm?: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("equipment")
      .select(`
        id,
        tag,
        name,
        criticality,
        systems!inner (
          id,
          name,
          areas!inner (
            id,
            name
          )
        ),
        weekly_reports (
          id,
          week_number,
          year,
          status,
          sap_notification,
          sap_order,
          technical_description,
          planned_date
        )
      `)
      .range(from, from + PAGE_SIZE - 1);

    if (areaId !== "all") {
      query = query.eq("systems.areas.id", areaId);
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.trim();
      query = query.or(`tag.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export function useDashboardData(filters: DashboardFilters) {
  const areasQuery = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const systemsQuery = useQuery({
    queryKey: ["systems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("systems")
        .select("id, name, area_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const debugCountsQuery = useQuery({
    queryKey: ["debug-counts", filters.week, filters.year],
    queryFn: async () => {
      const [equipmentCount, totalReportsCount, weekReportsCount] = await Promise.all([
        supabase.from("equipment").select("id", { count: "exact", head: true }),
        supabase.from("weekly_reports").select("id", { count: "exact", head: true }),
        supabase
          .from("weekly_reports")
          .select("id", { count: "exact", head: true })
          .eq("week_number", filters.week)
          .eq("year", filters.year),
      ]);

      return {
        totalEquipment: equipmentCount.count || 0,
        totalReports: totalReportsCount.count || 0,
        reportsInSelectedWeek: weekReportsCount.count || 0,
      } as DebugCounts;
    },
  });

  const equipmentQuery = useQuery({
    queryKey: ["dashboard-equipment", filters],
    queryFn: async () => {
      const data = await fetchAllEquipment(filters.areaId, filters.searchTerm);

      const equipmentWithCurrentWeek = data.map((eq: any) => {
        const currentReport = eq.weekly_reports.find(
          (r: any) => r.week_number === filters.week && r.year === filters.year
        );
        return {
          ...eq,
          currentStatus: currentReport?.status || "Sin Registro",
          currentReport,
        };
      });

      return equipmentWithCurrentWeek as EquipmentWithReport[];
    },
  });

  const stats = equipmentQuery.data
    ? calculateStats(equipmentQuery.data)
    : { total: 0, satisfactorio: 0, seguimiento: 0, alerta: 0, critico: 0, sinMedicion: 0, sinRegistro: 0 };

  const statsByArea: GroupedStats[] = equipmentQuery.data && areasQuery.data
    ? areasQuery.data.map((area) => {
        const areaEquipment = equipmentQuery.data.filter(
          (eq) => eq.systems.areas.id === area.id
        );
        const areaStats = calculateStats(areaEquipment);
        return {
          id: area.id,
          name: area.name,
          ...areaStats,
        };
      }).filter((area) => area.total > 0)
    : [];

  const statsBySystem: GroupedStats[] = equipmentQuery.data && systemsQuery.data && filters.areaId !== "all"
    ? (() => {
        const filteredSystems = systemsQuery.data.filter((system) => system.area_id === filters.areaId);
        
        const result = filteredSystems.map((system) => {
          const systemEquipment = equipmentQuery.data.filter(
            (eq) => eq.systems.id === system.id
          );
          const systemStats = calculateStats(systemEquipment);
          return {
            id: system.id,
            name: system.name,
            total: systemStats.total,
            satisfactorio: systemStats.satisfactorio,
            seguimiento: systemStats.seguimiento,
            alerta: systemStats.alerta,
            critico: systemStats.critico,
          };
        }).filter((system) => system.total > 0);
        
        return result;
      })()
    : [];

  // Get critical alerts (Crítico or Alerta)
  const criticalAlerts = equipmentQuery.data
    ?.filter((eq) => eq.currentStatus === "Crítico" || eq.currentStatus === "Alerta")
    .map((eq) => ({
      id: eq.id,
      tag: eq.tag,
      name: eq.name,
      status: eq.currentStatus as "Crítico" | "Alerta",
      area: eq.systems.areas.name,
      system: eq.systems.name,
      description: eq.currentReport?.technical_description || undefined,
      plannedDate: eq.currentReport?.planned_date || undefined,
    })) || [];

  return {
    areas: areasQuery.data || [],
    systems: systemsQuery.data || [],
    equipment: equipmentQuery.data || [],
    stats,
    statsByArea,
    statsBySystem,
    criticalAlerts,
    debugCounts: debugCountsQuery.data || { totalEquipment: 0, totalReports: 0, reportsInSelectedWeek: 0 },
    isLoading: areasQuery.isLoading || equipmentQuery.isLoading || systemsQuery.isLoading,
    error: areasQuery.error || equipmentQuery.error || systemsQuery.error,
  };
}
