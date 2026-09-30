import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TemperatureSystem = "stc" | "str";

const tableFor = (system: TemperatureSystem) => ({
  stations: `${system}_stations` as "stc_stations" | "str_stations",
  spools: `${system}_spools` as "stc_spools" | "str_spools",
  readings: `${system}_temperature_readings` as "stc_temperature_readings" | "str_temperature_readings",
  weeks: `${system}_tracking_weeks` as "stc_tracking_weeks" | "str_tracking_weeks",
  charts: `${system}_custom_charts` as "stc_custom_charts" | "str_custom_charts",
});

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

export function useStcStations(system: TemperatureSystem = "stc") {
  return useQuery({
    queryKey: [system, "stations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(tableFor(system).stations)
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as StcStation[];
    },
  });
}

export function useStcSpools(system: TemperatureSystem = "stc") {
  return useQuery({
    queryKey: [system, "spools"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(tableFor(system).spools)
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as StcSpool[];
    },
  });
}

export function useStcReadings(system: TemperatureSystem = "stc") {
  return useQuery({
    queryKey: ["stc_readings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(tableFor(system).readings)
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data as StcReading[];
    },
  });
}

export function useStcTrackingWeeks(system: TemperatureSystem = "stc") {
  return useQuery({
    queryKey: [system, "weeks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(tableFor(system).weeks)
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data as StcTrackingWeek[];
    },
  });
}

export function useUpdateReading(system: TemperatureSystem = "stc") {
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
      const { error } = await (supabase as any)
        .from(tableFor(system).readings)
        .upsert(row, { onConflict: "spool_id,week_number,year" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}

export function useConfirmAllPending(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_number: number; year: number }) => {
      const { error } = await (supabase as any)
        .from(tableFor(system).readings)
        .update({ confirmed: true })
        .eq("week_number", input.week_number)
        .eq("year", input.year)
        .eq("confirmed", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stc_readings"] }),
  });
}

export function usePublishWeek(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_number: number; year: number }) => {
      const { error } = await (supabase as any)
        .from(tableFor(system).weeks)
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
    onSuccess: () => qc.invalidateQueries({ queryKey: [system, "weeks"] }),
  });
}

export interface StcCustomChart {
  id: string;
  name: string;
  spool_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useCustomCharts(system: TemperatureSystem = "stc") {
  return useQuery({
    queryKey: [system, "charts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(tableFor(system).charts)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StcCustomChart[];
    },
  });
}

export function useCreateCustomChart(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; spool_ids: string[] }) => {
      const { error } = await (supabase as any).from(tableFor(system).charts).insert({
        name: input.name,
        spool_ids: input.spool_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [system, "charts"] }),
  });
}

export function useUpdateCustomChart(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; spool_ids: string[] }) => {
      const { error } = await (supabase as any)
        .from(tableFor(system).charts)
        .update({ name: input.name, spool_ids: input.spool_ids })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [system, "charts"] }),
  });
}

export function useDeleteCustomChart(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(tableFor(system).charts).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [system, "charts"] }),
  });
}


export function useAddWeek(system: TemperatureSystem = "stc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      week_number: number;
      year: number;
      spool_ids: string[];
    }) => {
      // Ensure a tracking-week row exists as unpublished draft.
      const { error: twErr } = await (supabase as any)
        .from(tableFor(system).weeks)
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
      const { error } = await (supabase as any)
        .from(tableFor(system).readings)
        .upsert(rows, { onConflict: "spool_id,week_number,year", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stc_readings"] });
      qc.invalidateQueries({ queryKey: [system, "weeks"] });
    },
  });
}
