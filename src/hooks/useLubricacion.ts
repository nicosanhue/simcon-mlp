import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LubOptionCategory =
  | "aceite"
  | "grasa"
  | "frecuencia"
  | "acoplamiento"
  | "tipo_equipo";

export interface LubData {
  id?: string;
  equipment_id: string;
  sap_number: string | null;
  tipo: string | null;
  descripcion: string | null;
  has_motor: boolean;
  has_portarodamiento: boolean;
  has_reductor: boolean;
  has_descanso: boolean;
  acop_alta_tipo: string | null;
  acop_alta_grasa: string | null;
  acop_alta_aceite: string | null;
  acop_alta_cantidad: number | null;
  acop_alta_frecuencia: string | null;
  acop_baja_tipo: string | null;
  acop_baja_grasa: string | null;
  acop_baja_aceite: string | null;
  acop_baja_cantidad: number | null;
  acop_baja_frecuencia: string | null;
  motor_tipo_lub: string | null;
  motor_desc_ll: string | null;
  motor_desc_ll_cant: number | null;
  motor_desc_la: string | null;
  motor_desc_la_cant: number | null;
  motor_desc_frecuencia: string | null;
  motor_sello_ll: string | null;
  motor_sello_ll_cant: number | null;
  motor_sello_la: string | null;
  motor_sello_la_cant: number | null;
  motor_sello_frecuencia: string | null;
  motor_frecuencia: string | null;
  reductor_aceite: string | null;
  reductor_capacidad: number | null;
  reductor_aceite_frecuencia: string | null;
  reductor_sello_ll: string | null;
  reductor_sello_ll_cant: number | null;
  reductor_sello_la: string | null;
  reductor_sello_la_cant: number | null;
  reductor_frecuencia: string | null;
  porta_tipo_lub: string | null;
  porta_desc_ll: string | null;
  porta_desc_ll_cant: number | null;
  porta_desc_la: string | null;
  porta_desc_la_cant: number | null;
  porta_desc_frecuencia: string | null;
  porta_sello_ll: string | null;
  porta_sello_ll_cant: number | null;
  porta_sello_la: string | null;
  porta_sello_la_cant: number | null;
  porta_sello_frecuencia: string | null;
  porta_frecuencia: string | null;
  descanso_condicion: string | null;
  descanso_grasa: string | null;
  descanso_cantidad: number | null;
  descanso_frecuencia: string | null;
  descanso_sello_ll: string | null;
  descanso_sello_ll_cant: number | null;
  descanso_sello_frecuencia: string | null;

}

export interface LubEquipmentRow {
  id: string;
  tag: string;
  name: string;
  system_id: string;
  systemName: string;
  areaName: string;
  data: LubData | null;
}

export function emptyLubData(equipment_id: string): LubData {
  return {
    equipment_id,
    sap_number: null,
    tipo: null,
    descripcion: null,
    has_motor: false,
    has_portarodamiento: false,
    has_reductor: false,
    has_descanso: false,
    acop_alta_tipo: null,
    acop_alta_grasa: null,
    acop_alta_aceite: null,
    acop_alta_cantidad: null,
    acop_alta_frecuencia: null,
    acop_baja_tipo: null,
    acop_baja_grasa: null,
    acop_baja_aceite: null,
    acop_baja_cantidad: null,
    acop_baja_frecuencia: null,
    motor_tipo_lub: null,
    motor_desc_ll: null,
    motor_desc_ll_cant: null,
    motor_desc_la: null,
    motor_desc_la_cant: null,
    motor_desc_frecuencia: null,
    motor_sello_ll: null,
    motor_sello_ll_cant: null,
    motor_sello_la: null,
    motor_sello_la_cant: null,
    motor_sello_frecuencia: null,
    motor_frecuencia: null,
    reductor_aceite: null,
    reductor_capacidad: null,
    reductor_aceite_frecuencia: null,
    reductor_sello_ll: null,
    reductor_sello_ll_cant: null,
    reductor_sello_la: null,
    reductor_sello_la_cant: null,
    reductor_frecuencia: null,
    porta_tipo_lub: null,
    porta_desc_ll: null,
    porta_desc_ll_cant: null,
    porta_desc_la: null,
    porta_desc_la_cant: null,
    porta_desc_frecuencia: null,
    porta_sello_ll: null,
    porta_sello_ll_cant: null,
    porta_sello_la: null,
    porta_sello_la_cant: null,
    porta_sello_frecuencia: null,
    porta_frecuencia: null,
    descanso_condicion: null,
    descanso_grasa: null,
    descanso_cantidad: null,
    descanso_frecuencia: null,
    descanso_sello_ll: null,
    descanso_sello_ll_cant: null,
    descanso_sello_frecuencia: null,

  };
}

const PAGE = 1000;

export function useLubEquipment() {
  return useQuery({
    queryKey: ["lub-equipment"],
    queryFn: async (): Promise<LubEquipmentRow[]> => {
      const equipment: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("equipment")
          .select("id, tag, name, system_id, systems ( name, areas ( name ) )")
          .order("tag")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        equipment.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }

      const lub: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("lub_equipment_data")
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        lub.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      const byEq = new Map<string, any>(lub.map((l) => [l.equipment_id, l]));

      return equipment.map((e) => ({
        id: e.id,
        tag: e.tag,
        name: e.name,
        system_id: e.system_id,
        systemName: e.systems?.name || "Sin sistema",
        areaName: e.systems?.areas?.name || "Sin área",
        data: (byEq.get(e.id) as LubData) || null,
      }));
    },
  });
}

export function useLubOptions() {
  return useQuery({
    queryKey: ["lub-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lub_options")
        .select("*")
        .order("orden");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const o of data || []) {
        (map[o.categoria] ||= []).push(o.valor);
      }
      return map;
    },
  });
}

export function useSaveLubOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoria, valor }: { categoria: string; valor: string }) => {
      const { error } = await supabase
        .from("lub_options")
        .insert({ categoria, valor, orden: 999 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lub-options"] }),
  });
}

export function useSaveLubData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LubData) => {
      const { id, ...rest } = input as any;
      const { error } = await supabase
        .from("lub_equipment_data")
        .upsert(rest, { onConflict: "equipment_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lub-equipment"] }),
  });
}

/* ---------------- Photos ---------------- */

export interface LubPhoto {
  id: string;
  equipment_id: string;
  storage_path: string;
  caption: string | null;
  orden: number;
  url?: string;
}

export function useLubPhotos(equipmentId?: string) {
  return useQuery({
    queryKey: ["lub-photos", equipmentId],
    enabled: !!equipmentId,
    queryFn: async (): Promise<LubPhoto[]> => {
      const { data, error } = await supabase
        .from("lub_photos")
        .select("*")
        .eq("equipment_id", equipmentId!)
        .order("orden");
      if (error) throw error;
      const rows = (data || []) as LubPhoto[];
      if (!rows.length) return [];
      const { data: signed } = await supabase.storage
        .from("lubricacion-photos")
        .createSignedUrls(rows.map((r) => r.storage_path), 3600);
      return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl }));
    },
  });
}

/** Redimensiona y comprime a JPEG para que las fotos ocupen poco espacio */
export async function compressImage(file: File, maxSide = 1600, quality = 0.7): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir"))), "image/jpeg", quality)
  );
}

export function useUploadLubPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ equipmentId, files }: { equipmentId: string; files: File[] }) => {
      const { count } = await supabase
        .from("lub_photos")
        .select("id", { count: "exact", head: true })
        .eq("equipment_id", equipmentId);
      let orden = count ?? 0;
      for (const f of files) {
        const blob = await compressImage(f);
        const path = `${equipmentId}/${Date.now()}-${orden}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("lubricacion-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("lub_photos").insert({
          equipment_id: equipmentId,
          storage_path: path,
          caption: f.name,
          orden: orden++,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lub-photos"] });
      qc.invalidateQueries({ queryKey: ["lub-photo-counts"] });
    },
  });
}

export function useDeleteLubPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: LubPhoto) => {
      await supabase.storage.from("lubricacion-photos").remove([photo.storage_path]);
      const { error } = await supabase.from("lub_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lub-photos"] });
      qc.invalidateQueries({ queryKey: ["lub-photo-counts"] });
    },
  });
}

/* ---------------- Manuals (por sistema) ---------------- */

export interface LubManual {
  id: string;
  system_id: string;
  storage_path: string;
  nombre: string;
  size_bytes: number | null;
  created_at?: string;
}

export function useLubManuals() {
  return useQuery({
    queryKey: ["lub-manuals"],
    queryFn: async (): Promise<LubManual[]> => {
      const { data, error } = await supabase
        .from("lub_manuals")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data || []) as LubManual[];
    },
  });
}

export async function openManual(m: LubManual) {
  const { data, error } = await supabase.storage
    .from("lubricacion-manuals")
    .createSignedUrl(m.storage_path, 3600);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

export function useUploadManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ systemId, file }: { systemId: string; file: File }) => {
      const path = `${systemId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("lubricacion-manuals")
        .upload(path, file, { contentType: file.type || "application/pdf" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("lub_manuals").insert({
        system_id: systemId,
        storage_path: path,
        nombre: file.name,
        size_bytes: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lub-manuals"] }),
  });
}

export function useDeleteManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: LubManual) => {
      await supabase.storage.from("lubricacion-manuals").remove([m.storage_path]);
      const { error } = await supabase.from("lub_manuals").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lub-manuals"] }),
  });
}

/** Descarga directa de un documento del sistema */
export async function downloadManual(m: LubManual) {
  const { data, error } = await supabase.storage
    .from("lubricacion-manuals")
    .createSignedUrl(m.storage_path, 3600, { download: m.nombre });
  if (error) throw error;
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = m.nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Conteo de fotografías por equipo (para los iconos de la tabla) */
export function useLubPhotoCounts() {
  return useQuery({
    queryKey: ["lub-photo-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const rows: { equipment_id: string }[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("lub_photos")
          .select("equipment_id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data || []) as { equipment_id: string }[]));
        if (!data || data.length < PAGE) break;
      }
      const map: Record<string, number> = {};
      for (const r of rows) map[r.equipment_id] = (map[r.equipment_id] || 0) + 1;
      return map;
    },
  });
}
