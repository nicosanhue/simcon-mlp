// Concentraducto 370: datos PI (tags 370:*) y SAP (IW29/IW39) en vivo desde Databricks. Solo lectura.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { query, IW29, IW39, isOpenStatus } from "../_shared/sap.ts";
import { TAGS } from "./tags.ts";

const PI_INTERP = "hive_metastore.mlp_raw.pi_system_data";
const PI_REC = "hive_metastore.mlp_raw.pi_system_recorded_data";
const UT_FILTER = "(ubicacion_tecnica LIKE 'LP2.03%' OR ubicacion_tecnica LIKE 'LP2.05.11.FRX04%')";
const HOURS = 49;
const CACHE_MS = 4 * 60_000;

const strip = (s: string | null | undefined) => (s ? s.replace(/^0+/, "") : "");
const num = (v: string | null | undefined) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Estación/tramo del ducto según ubicación técnica (mismas reglas que la página original).
const NODE_RULES: [string, string][] = [
  ["LP2.03.02.SEV01.PV01", "T0"], ["LP2.03.02.SEV01.PV02", "T22"], ["LP2.03.02.SEV01.PV03", "T39"],
  ["LP2.03.02.SEV01.PV04", "T60"], ["LP2.03.02.SEV01.PV05", "T80"], ["LP2.03.02.SEV01.PV06", "T93"],
  ["LP2.03.02.SBB01", "KM0"], ["LP2.05.11.FRX04", "KM0"], ["LP2.03.02.SVV01", "KM22"], ["LP2.03.02.SEM01", "KM39"],
  ["LP2.03.02.SEM02", "KM60"], ["LP2.03.02.SEB01", "KM80"], ["LP2.03.02.SEM03", "KM93"], ["LP2.03.02.SED01", "KM120"],
  ["LP2.03.01", "TK"], ["LP2.07.04.SDF02", "FUGAS"], ["LP2.03.02", "GEN"],
];
export const nodeOf = (ut: string) => NODE_RULES.find(([p]) => ut.startsWith(p))?.[1] ?? "GEN";

const inParams = (vals: string[], prefix: string) => {
  const params = vals.map((v, i) => ({ name: `${prefix}${i}`, value: v }));
  return { params, list: params.map((p) => `:${p.name}`).join(",") };
};

const hourKey = (d: Date) => d.toISOString().slice(0, 13);

async function loadPi(token: string) {
  const now = new Date();
  const end = new Date(now); end.setUTCMinutes(0, 0, 0);
  const hours: string[] = [];
  for (let i = HOURS - 1; i >= 0; i--) hours.push(hourKey(new Date(end.getTime() - i * 3600_000)));
  const since = new Date(end.getTime() - (HOURS - 1) * 3600_000);
  const months = [...new Set([since, now].map((d) => d.toISOString().slice(0, 7)))];
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);

  const interp = TAGS.filter((t) => t.src === "interpolado").map((t) => t.tag);
  const rec = TAGS.filter((t) => t.src === "recorded").map((t) => t.tag);
  const a = inParams(interp, "t");
  const b = inParams(rec, "r");
  const mi = inParams(months, "m");
  const mr = inParams([...new Set([prevMonth, ...months])], "m");
  const sinceP = { name: "since", value: since.toISOString().replace("T", " ").slice(0, 19) };

  const hourly = (tbl: string, x: typeof a, m: typeof mi) =>
    query(token,
      `SELECT id_tag, date_format(timestamp, "yyyy-MM-dd'T'HH") h, avg(try_cast(valor AS DOUBLE)), max_by(valor, timestamp), max(timestamp)
       FROM ${tbl} WHERE particion IN (${m.list}) AND timestamp >= to_timestamp(:since) AND id_tag IN (${x.list}) GROUP BY 1, 2`,
      [...x.params, ...m.params, sinceP]);

  const [ri, rr, lastRec] = await Promise.all([
    hourly(PI_INTERP, a, mi),
    hourly(PI_REC, b, mi),
    // Los tags "recorded" cambian poco: se toma su último valor aunque sea anterior a 48 h.
    query(token, `SELECT id_tag, max_by(valor, timestamp), max(timestamp) FROM ${PI_REC} WHERE particion IN (${mr.list}) AND id_tag IN (${b.list}) GROUP BY 1`,
      [...b.params, ...mr.params]),
  ]);

  const byTag: Record<string, Record<string, { avg: number | null; last: string | null; t: string }>> = {};
  for (const r of [...ri, ...rr]) {
    const tag = r[0]!;
    (byTag[tag] ||= {})[r[1]!] = { avg: num(r[2]), last: r[3], t: r[4]! };
  }
  const recLast: Record<string, { v: string | null; t: string }> = {};
  for (const r of lastRec) recLast[r[0]!] = { v: r[1], t: r[2]! };

  const live: Record<string, { t: string | null; v: string; num: number | null; s: (number | null)[] }> = {};
  let snap = "";
  for (const { tag, src } of TAGS) {
    const h = byTag[tag] || {};
    let latest: { last: string | null; t: string } | null = null;
    for (const k of Object.keys(h)) if (!latest || h[k].t > latest.t) latest = h[k];
    if (src === "recorded" && recLast[tag] && (!latest || recLast[tag].t > latest.t)) latest = { last: recLast[tag].v, t: recLast[tag].t };
    // Serie horaria; si una hora no tiene dato, se repite el último conocido (como en PI).
    let carry: number | null = src === "recorded" && recLast[tag] && recLast[tag].t < since.toISOString() ? num(recLast[tag].v) : null;
    const s = hours.map((hk) => {
      const v = h[hk]?.avg;
      if (v != null) carry = Math.round(v * 1000) / 1000;
      return carry;
    });
    const v = latest?.last ?? "";
    live[tag] = { t: latest?.t ?? null, v, num: num(v), s };
    if (latest?.t && latest.t > snap) snap = latest.t;
  }
  return { hours, live, snap: snap || now.toISOString() };
}

async function loadSap(token: string) {
  const weeksAgo = new Date(Date.now() - 26 * 7 * 86400_000).toISOString().slice(0, 10);
  const wk = { name: "desde", value: weeksAgo };
  const [av, ot, wav, wot] = await Promise.all([
    query(token, `SELECT aviso, tipo_de_aviso, descripcion, fecha_de_aviso, prioridad, status_sistema, status_usuario, ubicacion_tecnica, equipo, denominacion, orden, pto_tbjo_responsable
      FROM ${IW29} WHERE ${UT_FILTER} AND NOT coalesce(status_sistema, '') RLIKE 'MECE|CERR'`, []),
    query(token, `SELECT orden, clase_orden, texto_breve, status_del_sistema, status_de_usuario, ubicacion_tecnica, denominacion_de_la_ubicacion_tecnica, equipo, fecha_entrada,
      fecha_de_inicio_extrema, prioridad, texto_para_prioridad, aviso, pto_trabajo_responsable, gastos_estimados, costes_tot_reales
      FROM ${IW39} WHERE ${UT_FILTER} AND NOT coalesce(status_del_sistema, '') RLIKE 'CTEC|CERR'`, []),
    query(token, `SELECT date_trunc('WEEK', to_date(fecha_de_aviso)), tipo_de_aviso, count(*) FROM ${IW29} WHERE ${UT_FILTER} AND to_date(fecha_de_aviso) >= to_date(:desde) GROUP BY 1, 2`, [wk]),
    query(token, `SELECT date_trunc('WEEK', to_date(fecha_entrada)), clase_orden, count(*) FROM ${IW39} WHERE ${UT_FILTER} AND to_date(fecha_entrada) >= to_date(:desde) GROUP BY 1, 2`, [wk]),
  ]);
  const utn: Record<string, string> = {};
  const avisos = av.map((r) => {
    const ut = r[7] ?? "";
    if (ut && r[9]) utn[ut] = r[9];
    return { id: strip(r[0]), tipo: r[1] ?? "", txt: r[2] ?? "", f: r[3] ?? "", pri: r[4] ?? "", st: r[5] ?? "", stu: r[6] ?? "",
      ut, utn: r[9] ?? "", eq: strip(r[8]), den: r[9] ?? "", ot: strip(r[10]), node: nodeOf(ut), pt: r[11] ?? "" };
  });
  const ots = ot.filter((r) => isOpenStatus(r[3])).map((r) => {
    const ut = r[5] ?? "";
    if (ut && r[6]) utn[ut] = r[6];
    return { id: strip(r[0]), cl: r[1] ?? "", txt: r[2] ?? "", st: r[3] ?? "", stu: r[4] ?? "", ut, utn: r[6] ?? "", eq: strip(r[7]),
      f: r[8] ?? "", fi: r[9] ?? "", pri: r[10] ?? "", prit: r[11] ?? "", av: strip(r[12]), pt: r[13] ?? "",
      est: num(r[14]) ?? 0, real: num(r[15]) ?? 0, node: nodeOf(ut) };
  });
  return {
    avisos, ots, utn,
    weekly: { av: wav.map((r) => [r[0], r[1], r[2]]), ot: wot.map((r) => [r[0], r[1], r[2]]) },
    sapIng: new Date().toISOString(),
  };
}

let cache: { at: number; data: unknown } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const token = Deno.env.get("DATABRICKS_TOKEN");
    if (!token) return json({ error: "DATABRICKS_TOKEN no configurado" }, 500);
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (!force && cache && Date.now() - cache.at < CACHE_MS) return json(cache.data);

    const [pi, sap] = await Promise.allSettled([loadPi(token), loadSap(token)]);
    const errors: Record<string, string> = {};
    if (pi.status === "rejected") { errors.pi = String(pi.reason?.message ?? pi.reason); console.error("PI:", errors.pi); }
    if (sap.status === "rejected") { errors.sap = String(sap.reason?.message ?? sap.reason); console.error("SAP:", errors.sap); }
    const data = {
      generatedAt: new Date().toISOString(),
      pi: pi.status === "fulfilled" ? pi.value : null,
      sap: sap.status === "fulfilled" ? sap.value : null,
      errors,
    };
    if (!errors.pi && !errors.sap) cache = { at: Date.now(), data };
    return json(data);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
