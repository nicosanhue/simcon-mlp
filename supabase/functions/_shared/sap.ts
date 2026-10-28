// Consulta SAP (IW29/IW39) en Databricks. Solo lectura.
const HOST = "https://adb-5534975844772448.8.azuredatabricks.net";
const WAREHOUSE_ID = "f502d71903cb6768";
export const IW29 = "hive_metastore.amsa_provisioning.dmt_sap_transacciones_iw29_mst";
export const IW39 = "hive_metastore.amsa_provisioning.dmt_sap_transacciones_iw39_mst";

export interface SapOt { orden: string | null; fecha_inicio_extrema: string | null; status: string | null; texto: string | null; abierta: boolean }
export interface SapAvisoInfo {
  en_iw29: boolean;
  status_aviso: string | null;
  descripcion_aviso: string | null;
  orden_iw29: string | null;
  ordenes: SapOt[];
  orden_principal: string | null;
  fecha_inicio_extrema: string | null;
  ot_abierta: boolean | null;
  fecha_creacion_aviso: string | null;
  fecha_aviso: string | null;
}

const strip = (s: string | null | undefined) => (s ? s.replace(/^0+/, "") : null);
export const isOpenStatus = (s: string | null) => !!s && !/\b(CTEC|CERR)\b/.test(s);

export async function query(token: string, statement: string, params: { name: string; value: string }[]) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const res = await fetch(`${HOST}/api/2.0/sql/statements`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement,
      parameters: params.map((p) => ({ ...p, type: "STRING" })),
      wait_timeout: "50s",
      on_wait_timeout: "CONTINUE",
      disposition: "INLINE",
      format: "JSON_ARRAY",
    }),
  });
  let body = await res.json().catch(() => ({}));
  // Si el warehouse estaba detenido, la consulta sigue en curso: esperar hasta ~100 s más.
  const started = Date.now();
  while (res.ok && body?.statement_id && ["PENDING", "RUNNING"].includes(body?.status?.state) && Date.now() - started < 100_000) {
    await new Promise((r) => setTimeout(r, 2500));
    const r2 = await fetch(`${HOST}/api/2.0/sql/statements/${body.statement_id}`, { headers });
    body = await r2.json().catch(() => ({}));
  }
  if (!res.ok || body?.status?.state !== "SUCCEEDED") {
    throw new Error(`Databricks: ${body?.status?.error?.message || body?.message || body?.status?.state || `HTTP ${res.status}`}`);
  }
  return (body.result?.data_array ?? []) as (string | null)[][];
}

/** Devuelve info SAP por aviso (clave sin ceros a la izquierda). Máx. 200 por llamada interna; divide en lotes. */
export async function lookupAvisos(avisos: string[]): Promise<Record<string, SapAvisoInfo>> {
  const token = Deno.env.get("DATABRICKS_TOKEN");
  if (!token) throw new Error("DATABRICKS_TOKEN no configurado");
  const all = [...new Set(avisos.map((a) => (a || "").trim()).filter((a) => /^\d{1,12}$/.test(a)).map((a) => a.padStart(12, "0")))];
  const out: Record<string, SapAvisoInfo> = {};
  for (let i = 0; i < all.length; i += 200) {
    const padded = all.slice(i, i + 200);
    const params = padded.map((v, j) => ({ name: `a${j}`, value: v }));
    const inList = params.map((p) => `:${p.name}`).join(",");
    const [r39, r29] = await Promise.all([
      query(token, `SELECT aviso, orden, fecha_de_inicio_extrema, status_del_sistema, texto_breve FROM ${IW39} WHERE aviso IN (${inList})`, params),
      query(token, `SELECT aviso, orden, status_sistema, descripcion, creado_el, fecha_de_aviso FROM ${IW29} WHERE aviso IN (${inList})`, params),
    ]);
    for (const a of padded) {
      const ots = r39
        .filter((r) => r[0] === a)
        .map((r) => ({ orden: strip(r[1]), fecha_inicio_extrema: r[2], status: r[3], texto: r[4], abierta: isOpenStatus(r[3]) }))
        .sort((x, y) => (y.fecha_inicio_extrema ?? "").localeCompare(x.fecha_inicio_extrema ?? ""));
      const n29 = r29.find((r) => r[0] === a);
      if (!n29 && !ots.length) continue;
      out[strip(a)!] = {
        en_iw29: !!n29,
        status_aviso: n29?.[2] ?? null,
        descripcion_aviso: n29?.[3] ?? null,
        orden_iw29: strip(n29?.[1]),
        ordenes: ots,
        orden_principal: ots[0]?.orden ?? strip(n29?.[1]),
        fecha_inicio_extrema: ots[0]?.fecha_inicio_extrema ?? null,
        ot_abierta: ots[0] ? ots[0].abierta : null,
        fecha_creacion_aviso: n29?.[4] ?? n29?.[5] ?? null,
        fecha_aviso: n29?.[5] ?? null,
      };
    }
  }
  return out;
}

/** Usuarios SAP que crean avisos MonCon. */
export const MONCON_CREATORS = ["eleonp"];
export const LUB_REGEX = "LUB|ACEIT|GRAS|MUESTR|ENGRAS|OIL";
export interface LubAviso {
  aviso: string; descripcion: string | null; creado_el: string | null; status_aviso: string | null;
  orden: string | null; status_ot: string | null; fecha_inicio_extrema: string | null;
}

/** Avisos de lubricación/aceite creados por MonCon en IW29, con su OT de IW39. */
export async function lookupLubricacionMonCon(creators = MONCON_CREATORS): Promise<LubAviso[]> {
  const token = Deno.env.get("DATABRICKS_TOKEN");
  if (!token) throw new Error("DATABRICKS_TOKEN no configurado");
  const params = creators.map((c, i) => ({ name: `c${i}`, value: c.toLowerCase() }));
  const rows = await query(token,
    `SELECT n.aviso, n.descripcion, n.creado_el, n.status_sistema, coalesce(o.orden, n.orden), o.status_del_sistema, o.fecha_de_inicio_extrema
     FROM ${IW29} n LEFT JOIN ${IW39} o ON o.aviso = n.aviso
     WHERE lower(n.creado_por) IN (${params.map((p) => `:${p.name}`).join(",")})
       AND upper(n.descripcion) RLIKE '${LUB_REGEX}'
     ORDER BY n.creado_el DESC`, params);
  const seen = new Set<string>();
  const out: LubAviso[] = [];
  for (const r of rows) {
    const aviso = strip(r[0])!;
    if (seen.has(aviso)) continue; // una OT principal por aviso
    seen.add(aviso);
    out.push({ aviso, descripcion: r[1], creado_el: r[2], status_aviso: r[3], orden: strip(r[4]) || null, status_ot: r[5], fecha_inicio_extrema: r[6] });
  }
  return out;
}
