import type { TemperatureSystem } from "@/hooks/useStcData";
import { supabase } from "@/integrations/supabase/client";

// Correspondencia estación -> plano en el bucket "stc-planos".
// Km39, Km60 y Km93 comparten el plano de Estaciones Monitoreadas (ISO-03).
export const STC_PLANOS: Record<string, string> = {
  KM00: "370-ISO-01_Km-0_Act._Jun-21.pdf",
  KM22: "370-ISO-02_Km-22_Act._Oct.2020.pdf",
  KM39: "370-ISO-03_Est.Monit.STC_Act._Sep-20.pdf",
  KM60: "370-ISO-03_Est.Monit.STC_Act._Sep-20.pdf",
  KM93: "370-ISO-03_Est.Monit.STC_Act._Sep-20.pdf",
  KM80: "370-ISO-04_Km-80_Act._Abr-20.pdf",
  KM120: "370-ISO-05_Km-120_Act._Mayo-21.pdf",
};

export function planoPathOf(stationCode: string, system: TemperatureSystem = "stc"): string | null {
  if (system === "str") return null;
  return STC_PLANOS[stationCode?.toUpperCase()] ?? null;
}

export async function planoSignedUrl(
  path: string,
  opts?: { download?: boolean; downloadName?: string },
  system: TemperatureSystem = "stc"
): Promise<string | null> {
  if (opts?.download) {
    const { data } = await supabase.storage
      .from(system === "stc" ? "stc-planos" : "str-planos")
      .createSignedUrl(path, 3600, { download: opts.downloadName ?? true });
    return data?.signedUrl ?? null;
  }
  const { data } = await supabase.storage.from(system === "stc" ? "stc-planos" : "str-planos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function downloadPlanoPdf(stationCode: string, system: TemperatureSystem = "stc"): Promise<void> {
  const path = planoPathOf(stationCode, system);
  if (!path) throw new Error("No hay plano asociado a esta estación");
  const url = await planoSignedUrl(path, { download: true }, system);
  if (!url) throw new Error("No se pudo generar el enlace del plano");
  const a = document.createElement("a");
  a.href = url;
  a.download = path;
  a.click();
}
