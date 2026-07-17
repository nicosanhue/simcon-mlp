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
  confirmed: boolean;
}

export interface StcTrackingWeek {
  id: string;
  week_number: number;
  year: number;
  published: boolean;
  published_at: string | null;
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

export function useStcTrackingWeeks() {
  return useQuery({
    queryKey: ["stc_tracking_weeks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stc_tracking_weeks")
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data as StcTrackingWeek[];
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
      confirmed?: boolean;
    }) => {
      const row: any = {
        spool_id: input.spool_id,
        week_number: input.week_number,
        year: input.year,
        delta_t: input.delta_t,
      };
      if (input.confirmed !== undefined) row.confirmed = input.confirmed;
      const { error } = await supabase
        .from("stc_temperature_readings")
        .upsert(row, { onConflict: "spool_id,week_number,year" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}

export function useConfirmAllPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_number: number; year: number }) => {
      const { error } = await supabase
        .from("stc_temperature_readings")
        .update({ confirmed: true })
        .eq("week_number", input.week_number)
        .eq("year", input.year)
        .eq("confirmed", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}

export function usePublishWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_number: number; year: number }) => {
      const { error } = await supabase
        .from("stc_tracking_weeks")
        .upsert(
          {
            week_number: input.week_number,
            year: input.year,
            published: true,
            published_at: new Date().toISOString(),
          },
          { onConflict: "week_number,year" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_tracking_weeks"] }),
  });
}

export interface StcCustomChart {
  id: string;
  name: string;
  spool_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useCustomCharts() {
  return useQuery({
    queryKey: ["stc_custom_charts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stc_custom_charts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StcCustomChart[];
    },
  });
}

export function useCreateCustomChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; spool_ids: string[] }) => {
      const { error } = await supabase.from("stc_custom_charts").insert({
        name: input.name,
        spool_ids: input.spool_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_custom_charts"] }),
  });
}

export function useDeleteCustomChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stc_custom_charts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_custom_charts"] }),
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
      // Ensure a tracking-week row exists as unpublished draft.
      const { error: twErr } = await supabase
        .from("stc_tracking_weeks")
        .upsert(
          {
            week_number: input.week_number,
            year: input.year,
            published: false,
          },
          { onConflict: "week_number,year", ignoreDuplicates: true },
        );
      if (twErr) throw twErr;

      const rows = input.spool_ids.map((sid) => ({
        spool_id: sid,
        week_number: input.week_number,
        year: input.year,
        delta_t: null,
        confirmed: false,
      }));
      const { error } = await supabase
        .from("stc_temperature_readings")
        .upsert(rows, { onConflict: "spool_id,week_number,year", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stc_readings"] });
      qc.invalidateQueries({ queryKey: ["stc_tracking_weeks"] });
    },
  });
}
