import { supabase } from "@/integrations/supabase/client";

export interface SapOt {
  orden: string | null;
  fecha_inicio_extrema: string | null;
  status: string | null;
  texto: string | null;
}
export interface SapAvisoInfo {
  en_iw29: boolean;
  status_aviso: string | null;
  descripcion_aviso: string | null;
  orden_iw29: string | null;
  ordenes: SapOt[];
  orden_principal: string | null;
  fecha_inicio_extrema: string | null;
}

/** Busca OTs (IW39) y datos del aviso (IW29) en SAP/Databricks. Claves sin ceros a la izquierda. */
export async function lookupAvisos(avisos: string[]): Promise<Record<string, SapAvisoInfo>> {
  const clean = [...new Set(avisos.map((a) => (a || "").trim()).filter((a) => /^\d{1,12}$/.test(a)))];
  if (!clean.length) return {};
  const { data, error } = await supabase.functions.invoke("sap-lookup", { body: { avisos: clean } });
  if (error) throw error;
  return (data?.results ?? {}) as Record<string, SapAvisoInfo>;
}

export const normAviso = (a: string | null | undefined) => (a || "").trim().replace(/^0+/, "");
