import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportTipo = "Vibraciones" | "Termografia" | "Ultrasonido";

export interface ReportPhoto {
  id: string;
  report_id: string;
  storage_path: string;
  caption: string | null;
  orden: number;
  signedUrl?: string;
}

export interface ReportRow {
  id: string;
  equipment_id: string;
  weekly_report_id: string | null;
  tipo: ReportTipo;
  week_number: number;
  year: number;
  fecha_inspeccion: string;
  tecnico: string | null;
  hallazgos: string | null;
  recomendacion: string | null;
  status_resultante: string;
  created_at: string;
  updated_at: string;
  equipment?: {
    id: string;
    tag: string;
    name: string;
    systems: { name: string; areas: { name: string } };
  };
  photos?: ReportPhoto[];
}

async function signPhotos(photos: ReportPhoto[]): Promise<ReportPhoto[]> {
  if (photos.length === 0) return [];
  const paths = photos.map((p) => p.storage_path);
  const { data } = await supabase.storage
    .from("report-photos")
    .createSignedUrls(paths, 3600);
  return photos.map((p, i) => ({ ...p, signedUrl: data?.[i]?.signedUrl }));
}

export function useReports(filters?: {
  tipo?: ReportTipo | "all";
  equipmentId?: string;
  week?: number;
  year?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select(
          `id, equipment_id, weekly_report_id, tipo, week_number, year, fecha_inspeccion, tecnico, hallazgos, recomendacion, status_resultante, created_at, updated_at,
           equipment:equipment_id ( id, tag, name, systems ( name, areas ( name ) ) ),
           photos:report_photos ( id, report_id, storage_path, caption, orden )`
        )
        .order("year", { ascending: false })
        .order("week_number", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.tipo && filters.tipo !== "all") q = q.eq("tipo", filters.tipo);
      if (filters?.equipmentId) q = q.eq("equipment_id", filters.equipmentId);
      if (filters?.week !== undefined) q = q.eq("week_number", filters.week);
      if (filters?.year !== undefined) q = q.eq("year", filters.year);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data as any as ReportRow[]) || [];
      if (filters?.search?.trim()) {
        const term = filters.search.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.equipment?.tag.toLowerCase().includes(term) ||
            r.equipment?.name.toLowerCase().includes(term)
        );
      }

      // sign photos
      for (const r of rows) {
        r.photos = await signPhotos((r.photos || []).sort((a, b) => a.orden - b.orden));
      }
      return rows;
    },
  });
}

export function useEquipmentReports(equipmentId?: string) {
  return useQuery({
    queryKey: ["equipment-reports", equipmentId],
    enabled: !!equipmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `id, equipment_id, weekly_report_id, tipo, week_number, year, fecha_inspeccion, tecnico, hallazgos, recomendacion, status_resultante, created_at, updated_at,
           photos:report_photos ( id, report_id, storage_path, caption, orden )`
        )
        .eq("equipment_id", equipmentId!)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      const rows = (data as any as ReportRow[]) || [];
      for (const r of rows) {
        r.photos = await signPhotos((r.photos || []).sort((a, b) => a.orden - b.orden));
      }
      return rows;
    },
  });
}

export interface SaveReportInput {
  id?: string;
  equipment_id: string;
  tipo: ReportTipo;
  week_number: number;
  year: number;
  fecha_inspeccion: string;
  tecnico?: string | null;
  hallazgos?: string | null;
  recomendacion?: string | null;
  status_resultante: string;
  newPhotos?: { blob: Blob; caption?: string | null }[];
  removePhotoIds?: string[];
}

export function useSaveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      let reportId = input.id;
      const payload = {
        equipment_id: input.equipment_id,
        tipo: input.tipo,
        week_number: input.week_number,
        year: input.year,
        fecha_inspeccion: input.fecha_inspeccion,
        tecnico: input.tecnico ?? null,
        hallazgos: input.hallazgos ?? null,
        recomendacion: input.recomendacion ?? null,
        status_resultante: input.status_resultante as any,
      };

      if (reportId) {
        const { error } = await supabase.from("reports").update(payload).eq("id", reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("reports").insert(payload).select("id").single();
        if (error) throw error;
        reportId = data.id;
      }

      if (input.removePhotoIds?.length) {
        const { data: photos } = await supabase
          .from("report_photos")
          .select("id, storage_path")
          .in("id", input.removePhotoIds);
        if (photos?.length) {
          await supabase.storage.from("report-photos").remove(photos.map((p) => p.storage_path));
          await supabase.from("report_photos").delete().in("id", input.removePhotoIds);
        }
      }

      if (input.newPhotos?.length) {
        let orden = Date.now();
        for (const p of input.newPhotos) {
          const path = `${reportId}/${orden}.jpg`;
          const { error: upErr } = await supabase.storage
            .from("report-photos")
            .upload(path, p.blob, { contentType: "image/jpeg", upsert: false });
          if (upErr) throw upErr;
          const { error: insErr } = await supabase.from("report_photos").insert({
            report_id: reportId,
            storage_path: path,
            caption: p.caption ?? null,
            orden: orden++,
          });
          if (insErr) throw insErr;
        }
      }

      return reportId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["equipment-reports"] });
      qc.invalidateQueries({ queryKey: ["reports-index"] });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: photos } = await supabase
        .from("report_photos")
        .select("storage_path")
        .eq("report_id", id);
      if (photos?.length) {
        await supabase.storage.from("report-photos").remove(photos.map((p) => p.storage_path));
      }
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["equipment-reports"] });
      qc.invalidateQueries({ queryKey: ["reports-index"] });
    },
  });
}

// Lightweight index used by dashboard to detect "informe pendiente"
export function useReportsIndex(week: number, year: number) {
  return useQuery({
    queryKey: ["reports-index", week, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("equipment_id")
        .eq("week_number", week)
        .eq("year", year);
      if (error) throw error;
      const set = new Set<string>((data || []).map((r: any) => r.equipment_id));
      return set;
    },
  });
}
