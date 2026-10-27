import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { lookupAvisos } from "../_shared/sap.ts";

const Body = z.union([
  z.object({ avisos: z.array(z.string().trim().regex(/^\d{1,12}$/)).min(1).max(1000) }),
  z.object({ action: z.literal("sync") }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const norm = (a: string | null) => (a || "").trim().replace(/^0+/, "");

/** Completa sap_order y planned_date vacíos en weekly_reports con datos de IW39 (sin sobrescribir). */
async function sync() {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: excluded } = await db
    .from("equipment")
    .select("id, systems!inner(areas!inner(name))")
    .eq("systems.areas.name", "Control Temperatura");
  const skip = new Set((excluded ?? []).map((e: any) => e.id));

  const rows: { id: string; equipment_id: string; sap_notification: string | null; sap_order: string | null; planned_date: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("weekly_reports")
      .select("id, equipment_id, sap_notification, sap_order, planned_date")
      .not("sap_notification", "is", null)
      .or("planned_date.is.null,sap_order.is.null,sap_order.eq.")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const pending = rows.filter((r) => !skip.has(r.equipment_id) && /^\d+$/.test(norm(r.sap_notification)));
  const info = await lookupAvisos(pending.map((r) => norm(r.sap_notification)));

  let updated = 0;
  for (const r of pending) {
    const i = info[norm(r.sap_notification)];
    if (!i) continue;
    const upd: Record<string, string> = {};
    if (!(r.sap_order || "").trim() && i.orden_principal) upd.sap_order = i.orden_principal;
    if (!r.planned_date && i.fecha_inicio_extrema) upd.planned_date = i.fecha_inicio_extrema;
    if (!Object.keys(upd).length) continue;
    const { error } = await db.from("weekly_reports").update(upd).eq("id", r.id);
    if (!error) updated++;
  }
  return { revisados: pending.length, encontrados_en_sap: Object.keys(info).length, actualizados: updated };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Solicitud inválida" }, 400);
  try {
    if ("action" in parsed.data) return json(await sync());
    return json({ results: await lookupAvisos(parsed.data.avisos) });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 502);
  }
});
