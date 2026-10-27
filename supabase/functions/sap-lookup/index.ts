import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const HOST = "https://adb-5534975844772448.8.azuredatabricks.net";
const WAREHOUSE_ID = "f502d71903cb6768";
const IW29 = "hive_metastore.amsa_provisioning.dmt_sap_transacciones_iw29_mst";
const IW39 = "hive_metastore.amsa_provisioning.dmt_sap_transacciones_iw39_mst";

const Body = z.object({
  avisos: z.array(z.string().trim().regex(/^\d{1,12}$/)).min(1).max(200),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function query(token: string, statement: string, params: { name: string; value: string }[]) {
  const res = await fetch(`${HOST}/api/2.0/sql/statements`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement,
      parameters: params.map((p) => ({ ...p, type: "STRING" })),
      wait_timeout: "50s",
      disposition: "INLINE",
      format: "JSON_ARRAY",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.status?.state !== "SUCCEEDED") {
    const msg = body?.status?.error?.message || body?.message || `HTTP ${res.status}`;
    throw new Error(`Databricks: ${msg}`);
  }
  return (body.result?.data_array ?? []) as (string | null)[][];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const token = Deno.env.get("DATABRICKS_TOKEN");
  if (!token) return json({ error: "DATABRICKS_TOKEN no configurado" }, 500);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Avisos inválidos (solo números)" }, 400);

  const padded = [...new Set(parsed.data.avisos.map((a) => a.padStart(12, "0")))];
  const params = padded.map((v, i) => ({ name: `a${i}`, value: v }));
  const inList = params.map((p) => `:${p.name}`).join(",");

  try {
    const [r39, r29] = await Promise.all([
      query(
        token,
        `SELECT aviso, orden, fecha_de_inicio_extrema, status_del_sistema, texto_breve FROM ${IW39} WHERE aviso IN (${inList})`,
        params,
      ),
      query(
        token,
        `SELECT aviso, orden, status_sistema, descripcion FROM ${IW29} WHERE aviso IN (${inList})`,
        params,
      ),
    ]);

    const strip = (s: string | null) => (s ? s.replace(/^0+/, "") : null);
    const results: Record<string, unknown> = {};
    for (const a of padded) {
      const key = strip(a)!;
      const ots = r39
        .filter((r) => r[0] === a)
        .map((r) => ({ orden: strip(r[1]), fecha_inicio_extrema: r[2], status: r[3], texto: r[4] }))
        .sort((x, y) => (y.fecha_inicio_extrema ?? "").localeCompare(x.fecha_inicio_extrema ?? ""));
      const n29 = r29.find((r) => r[0] === a);
      results[key] = {
        en_iw29: !!n29,
        status_aviso: n29?.[2] ?? null,
        descripcion_aviso: n29?.[3] ?? null,
        orden_iw29: strip(n29?.[1] ?? null),
        ordenes: ots,
        orden_principal: ots[0]?.orden ?? strip(n29?.[1] ?? null),
        fecha_inicio_extrema: ots[0]?.fecha_inicio_extrema ?? null,
      };
    }
    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 502);
  }
});
