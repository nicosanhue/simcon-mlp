import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StcStation {
  id: string;
  code: string;
  name: string;
  order_index: number;
}

export interface StcSpool {
  id: string;
  station_id: string;
  spool_number: number | null;
  tag: string;
  branch: "principal" | "variable_emergencia";
  order_index: number;
}

export interface StcReading {
  id: string;
  spool_id: string;
  week_number: number;
  year: number;
  delta_t: number | null;
  t_max: number | null;
  t_min: number | null;
  measured_at: string | null;
}

export function useStcStations() {
  return useQuery({
    queryKey: ["stc_stations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stc_stations")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as StcStation[];
    },
  });
}

export function useStcSpools() {
  return useQuery({
    queryKey: ["stc_spools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stc_spools")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as StcSpool[];
    },
  });
}

export function useStcReadings() {
  return useQuery({
    queryKey: ["stc_readings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stc_temperature_readings")
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data as StcReading[];
    },
  });
}

export function useUpdateReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      spool_id: string;
      week_number: number;
      year: number;
      delta_t: number | null;
    }) => {
      const { error } = await supabase
        .from("stc_temperature_readings")
        .upsert(
          {
            spool_id: input.spool_id,
            week_number: input.week_number,
            year: input.year,
            delta_t: input.delta_t,
          },
          { onConflict: "spool_id,week_number,year" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}

export function useAddWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      week_number: number;
      year: number;
      spool_ids: string[];
    }) => {
      const rows = input.spool_ids.map((sid) => ({
        spool_id: sid,
        week_number: input.week_number,
        year: input.year,
        delta_t: null,
      }));
      const { error } = await supabase
        .from("stc_temperature_readings")
        .upsert(rows, { onConflict: "spool_id,week_number,year", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}
