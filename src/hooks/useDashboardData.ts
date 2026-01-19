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
  operativo: number;
  alerta: number;
  falla: number;
}

function calculateStats(equipment: EquipmentWithReport[]) {
  return {
    total: equipment.length,
    operativo: equipment.filter((e) => e.currentStatus === "Operativo").length,
    alerta: equipment.filter((e) => e.currentStatus === "Alerta").length,
    falla: equipment.filter((e) => e.currentStatus === "Falla").length,
    sinRegistro: equipment.filter((e) => e.currentStatus === "Sin Registro").length,
  };
}

export function useDashboardData(filters: DashboardFilters) {
  // Fetch areas
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

  // Fetch systems for grouping
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

  // Fetch equipment with weekly reports
  const equipmentQuery = useQuery({
    queryKey: ["dashboard-equipment", filters],
    queryFn: async () => {
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
        `);

      const { data, error } = await query;
      if (error) throw error;

      // Filter by area if selected
      let filteredData = data;
      if (filters.areaId !== "all") {
        filteredData = data.filter(
          (eq) => eq.systems.areas.id === filters.areaId
        );
      }

      // Filter by search term if provided
      if (filters.searchTerm && filters.searchTerm.trim() !== "") {
        const term = filters.searchTerm.toLowerCase().trim();
        filteredData = filteredData.filter(
          (eq) =>
            eq.tag.toLowerCase().includes(term) ||
            eq.name.toLowerCase().includes(term)
        );
      }

      // Filter weekly reports by week/year
      const equipmentWithCurrentWeek = filteredData.map((eq) => {
        const currentReport = eq.weekly_reports.find(
          (r) => r.week_number === filters.week && r.year === filters.year
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

  // Calculate overall statistics
  const stats = equipmentQuery.data
    ? calculateStats(equipmentQuery.data)
    : { total: 0, operativo: 0, alerta: 0, falla: 0, sinRegistro: 0 };

  // Calculate stats grouped by area (when "all" is selected)
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

  // Calculate stats grouped by system (when a specific area is selected)
  // Note: equipmentQuery.data is already filtered by area, so we just need to group by system
  const statsBySystem: GroupedStats[] = equipmentQuery.data && systemsQuery.data && filters.areaId !== "all"
    ? (() => {
        const filteredSystems = systemsQuery.data.filter((system) => system.area_id === filters.areaId);
        console.log('[DEBUG] Filtered systems for area:', filters.areaId, filteredSystems);
        console.log('[DEBUG] Equipment data sample:', equipmentQuery.data.slice(0, 3));
        
        const result = filteredSystems.map((system) => {
          const systemEquipment = equipmentQuery.data.filter(
            (eq) => eq.systems.id === system.id
          );
          console.log('[DEBUG] System:', system.name, 'Equipment count:', systemEquipment.length);
          const systemStats = calculateStats(systemEquipment);
          return {
            id: system.id,
            name: system.name,
            total: systemStats.total,
            operativo: systemStats.operativo,
            alerta: systemStats.alerta,
            falla: systemStats.falla,
          };
        }).filter((system) => system.total > 0);
        
        console.log('[DEBUG] Final statsBySystem:', result);
        return result;
      })()
    : [];

  // Get critical alerts (Falla or Alerta)
  const criticalAlerts = equipmentQuery.data
    ?.filter((eq) => eq.currentStatus === "Falla" || eq.currentStatus === "Alerta")
    .map((eq) => ({
      id: eq.id,
      tag: eq.tag,
      name: eq.name,
      status: eq.currentStatus as "Falla" | "Alerta",
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
    isLoading: areasQuery.isLoading || equipmentQuery.isLoading || systemsQuery.isLoading,
    error: areasQuery.error || equipmentQuery.error || systemsQuery.error,
  };
}
