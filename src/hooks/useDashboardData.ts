import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFilters {
  week: number;
  year: number;
  areaId: string;
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

      return equipmentWithCurrentWeek;
    },
  });

  // Calculate statistics
  const stats = equipmentQuery.data
    ? {
        total: equipmentQuery.data.length,
        operativo: equipmentQuery.data.filter((e) => e.currentStatus === "Operativo").length,
        alerta: equipmentQuery.data.filter((e) => e.currentStatus === "Alerta").length,
        falla: equipmentQuery.data.filter((e) => e.currentStatus === "Falla").length,
        standby: equipmentQuery.data.filter((e) => e.currentStatus === "Stand By").length,
        sinRegistro: equipmentQuery.data.filter((e) => e.currentStatus === "Sin Registro").length,
      }
    : { total: 0, operativo: 0, alerta: 0, falla: 0, standby: 0, sinRegistro: 0 };

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
    equipment: equipmentQuery.data || [],
    stats,
    criticalAlerts,
    isLoading: areasQuery.isLoading || equipmentQuery.isLoading,
    error: areasQuery.error || equipmentQuery.error,
  };
}
