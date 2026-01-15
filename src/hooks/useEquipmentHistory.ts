import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EquipmentWithHistory {
  id: string;
  tag: string;
  name: string;
  criticality: string;
  system: {
    id: string;
    name: string;
    area: {
      id: string;
      name: string;
    };
  };
  reports: {
    id: string;
    week_number: number;
    year: number;
    status: string;
    sap_notification: string | null;
    sap_order: string | null;
    technical_description: string | null;
    planned_date: string | null;
  }[];
}

export function useEquipmentSearch(searchTerm: string) {
  return useQuery({
    queryKey: ["equipment-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const term = searchTerm.trim();
      
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          id,
          tag,
          name,
          criticality,
          systems (
            id,
            name,
            areas (
              id,
              name
            )
          )
        `)
        .or(`tag.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      return data.map((eq) => ({
        id: eq.id,
        tag: eq.tag,
        name: eq.name,
        criticality: eq.criticality,
        system: {
          id: eq.systems.id,
          name: eq.systems.name,
          area: {
            id: eq.systems.areas.id,
            name: eq.systems.areas.name,
          },
        },
      }));
    },
    enabled: searchTerm.trim().length >= 2,
  });
}

export function useEquipmentHistory(equipmentId: string | null) {
  return useQuery({
    queryKey: ["equipment-history", equipmentId],
    queryFn: async () => {
      if (!equipmentId) return null;

      const { data, error } = await supabase
        .from("equipment")
        .select(`
          id,
          tag,
          name,
          criticality,
          systems (
            id,
            name,
            areas (
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
        .eq("id", equipmentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Sort reports by year and week (newest first)
      const sortedReports = [...data.weekly_reports].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.week_number - a.week_number;
      });

      return {
        id: data.id,
        tag: data.tag,
        name: data.name,
        criticality: data.criticality,
        system: {
          id: data.systems.id,
          name: data.systems.name,
          area: {
            id: data.systems.areas.id,
            name: data.systems.areas.name,
          },
        },
        reports: sortedReports,
      } as EquipmentWithHistory;
    },
    enabled: !!equipmentId,
  });
}
