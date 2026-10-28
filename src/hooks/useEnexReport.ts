import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseRows, latestCritical, linkRow, type LubAviso, type EnexRow, type SapLink } from "@/lib/enexReport";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enex-report`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface EnexPayload {
  rows: string[][]; updated: string | null; fetchedAt: string;
  sap?: { avisos: LubAviso[] | null; error: string | null; at: string | null };
}

export async function fetchEnex(refresh = false): Promise<EnexPayload> {
  const res = await fetch(FN_URL + (refresh ? "?refresh=1" : ""), { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

export function useEnexReport() {
  return useQuery({ queryKey: ["enex-report"], queryFn: () => fetchEnex(), refetchInterval: 5 * 60_000, retry: 1 });
}

/** Última condición Crítico/Alerta por TAG con su vínculo SAP. */
export function useEnexLinks(data: EnexPayload | undefined) {
  return useMemo(() => {
    const avisos = data?.sap?.avisos ?? [];
    return latestCritical(parseRows(data?.rows ?? [])).map((r) => ({ row: r, link: linkRow(r, avisos) })) as { row: EnexRow; link: SapLink }[];
  }, [data]);
}
