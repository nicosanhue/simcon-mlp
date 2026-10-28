// Reporte ENEX: lee en vivo la hoja "Informes Activos Críticos MLP" (solo lectura).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { lookupLubricacionMonCon, type LubAviso } from "../_shared/sap.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SHEET_ID = "1hITkLudtTzbksQsO6_-URKt5Qwk3gtG2rdvU9vsBNj8";
const CACHE_MS = 2 * 60_000;
let cache: { at: number; body: string } | null = null;
let sapCache: { at: number; avisos: LubAviso[] } | null = null;

async function sapLub(): Promise<{ avisos: LubAviso[] | null; error: string | null; at: string | null }> {
  try {
    if (!sapCache || Date.now() - sapCache.at > 10 * 60_000) sapCache = { at: Date.now(), avisos: await lookupLubricacionMonCon() };
    return { avisos: sapCache.avisos, error: null, at: new Date(sapCache.at).toISOString() };
  } catch (e) {
    console.error("SAP lubricación:", e);
    return { avisos: sapCache?.avisos ?? null, error: String((e as Error).message ?? e), at: sapCache ? new Date(sapCache.at).toISOString() : null };
  }
}

const json = (b: unknown, status = 200) =>
  new Response(typeof b === "string" ? b : JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  if (refresh) sapCache = null;
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return json(cache.body);

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const sheetsKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!lovableKey || !sheetsKey) return json({ error: "Conexión con Google Sheets no configurada" }, 500);

  const url = `${GATEWAY}/spreadsheets/${SHEET_ID}/values:batchGet?ranges=Informes!A:H&ranges=Resumen!A1:B3`;
  const [res, sap] = await Promise.all([
    fetch(url, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": sheetsKey } }),
    sapLub(),
  ]);
  if (!res.ok) {
    const details = await res.text();
    console.error(`Sheets failed [${res.status}]: ${details}`);
    return json({ error: "No se pudo leer la hoja", status: res.status, details }, res.status);
  }
  const data = await res.json();
  const [informes, resumen] = data.valueRanges ?? [];
  const meta = Object.fromEntries((resumen?.values ?? []).filter((r: string[]) => r.length >= 2));
  const body = JSON.stringify({
    rows: informes?.values ?? [],
    updated: meta["Última actualización"] ?? null,
    source: meta["Fuente"] ?? null,
    fetchedAt: new Date().toISOString(),
    sap,
  });
  cache = { at: Date.now(), body };
  return json(body);
});
