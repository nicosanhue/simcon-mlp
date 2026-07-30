import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportPdfData, worstCondition } from "@/lib/pdfReport";

export type ReportTipo = "Vibraciones" | "Termografia" | "Ultrasonido";

export const COMPONENTES = ["Motor", "Reductor", "Portarodamiento", "Descanso"] as const;

export interface ReportPhoto {
  id: string;
  report_id: string;
  storage_path: string;
  caption: string | null;
  orden: number;
  signedUrl?: string;
}

export interface ReportItem {
  id?: string;
  report_id?: string;
  equipo_tag: string | null;
  componente: string;
  analisis_tecnico: string | null;
  diagnostico: string | null;
  recomendacion: string | null;
  condicion: string;
  aviso_sap: string | null;
  orden: number;
}

export interface ReportRow {
  id: string;
  equipment_id: string;
  weekly_report_id: string | null;
  tipo: ReportTipo;
  week_number: number;
  year: number;
  fecha_inspeccion: string;
  fecha_informe: string;
  gerencia: string | null;
  proceso_area: string | null;
  ot_numero: string | null;
  aviso_sap: string | null;
  condicion_general: string | null;
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
  items?: ReportItem[];
}

const SELECT_COLS = `id, equipment_id, weekly_report_id, tipo, week_number, year, fecha_inspeccion,
  fecha_informe, gerencia, proceso_area, ot_numero, aviso_sap, condicion_general,
  tecnico, hallazgos, recomendacion, status_resultante, created_at, updated_at,
  photos:report_photos ( id, report_id, storage_path, caption, orden ),
  items:report_items ( id, report_id, equipo_tag, componente, analisis_tecnico, diagnostico, recomendacion, condicion, aviso_sap, orden )`;

export function reportToPdfData(r: ReportRow): ReportPdfData {
  const items = (r.items || []).slice().sort((a, b) => a.orden - b.orden);
  return {
    tituloId: r.equipment ? `${r.equipment.tag} — ${r.equipment.name}` : "",
    fechaInforme: r.fecha_informe || r.fecha_inspeccion,
    gerencia: r.gerencia,
    avisoSap: r.aviso_sap,
    procesoArea:
      r.proceso_area ||
      (r.equipment
        ? `${r.equipment.systems?.areas?.name || ""} / ${r.equipment.systems?.name || ""}`
        : ""),
    otNumero: r.ot_numero,
    condicionGeneral:
      r.condicion_general || worstCondition(items.map((i) => i.condicion)),
    items: items.map((i) => ({
      equipoTag: i.equipo_tag || r.equipment?.tag || "",
      componente: i.componente,
      analisis: i.analisis_tecnico || "",
      diagnostico: i.diagnostico || "",
      recomendacion: i.recomendacion || "",
      condicion: i.condicion,
      avisoSap: i.aviso_sap || "",
    })),
    photos: (r.photos || []).map((p) => ({ url: p.signedUrl || "", caption: p.caption })),
  };
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
          `${SELECT_COLS}, equipment:equipment_id ( id, tag, name, systems ( name, areas ( name ) ) )`
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
          `${SELECT_COLS}, equipment:equipment_id ( id, tag, name, systems ( name, areas ( name ) ) )`
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
  week_number?: number;
  year?: number;
  fecha_inspeccion: string;
  fecha_informe: string;
  gerencia?: string | null;
  proceso_area?: string | null;
  ot_numero?: string | null;
  aviso_sap?: string | null;
  condicion_general: string;
  tecnico?: string | null;
  hallazgos?: string | null;
  recomendacion?: string | null;
  status_resultante: string;
  items: ReportItem[];
  newPhotos?: { blob: Blob; caption?: string | null }[];
  removePhotoIds?: string[];
}

/** ISO week number from a yyyy-mm-dd string */
export function isoWeekYear(dateStr: string): { week: number; year: number } {
  const d = new Date(`${(dateStr || "").slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { week: 1, year: now.getFullYear() };
  }
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return { week, year: target.getUTCFullYear() };
}

export function useSaveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveReportInput) => {
      let reportId = input.id;
      const derived = isoWeekYear(input.fecha_informe || input.fecha_inspeccion);
      const payload = {
        equipment_id: input.equipment_id,
        tipo: input.tipo,
        week_number: input.week_number ?? derived.week,
        year: input.year ?? derived.year,
        fecha_inspeccion: input.fecha_inspeccion,
        fecha_informe: input.fecha_informe,
        gerencia: GERENCIA_FIJA,
        proceso_area: input.proceso_area ?? null,
        ot_numero: input.ot_numero ?? null,
        aviso_sap: input.aviso_sap ?? null,
        condicion_general: input.condicion_general,
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

      // Replace items
      await supabase.from("report_items").delete().eq("report_id", reportId!);
      if (input.items.length) {
        const { error: itErr } = await supabase.from("report_items").insert(
          input.items.map((it, idx) => ({
            report_id: reportId!,
            equipo_tag: it.equipo_tag,
            componente: it.componente,
            analisis_tecnico: it.analisis_tecnico,
            diagnostico: it.diagnostico,
            recomendacion: it.recomendacion,
            condicion: it.condicion,
            aviso_sap: it.aviso_sap,
            orden: idx,
          }))
        );
        if (itErr) throw itErr;
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
        const { count } = await supabase
          .from("report_photos")
          .select("id", { count: "exact", head: true })
          .eq("report_id", reportId!);
        let orden = count ?? 0;
        const stamp = Date.now();
        for (const p of input.newPhotos) {
          const path = `${reportId}/${stamp}-${orden}.jpg`;
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
