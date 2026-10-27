import { corsHeaders as baseCors } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "npm:ai@7";
import { z } from "npm:zod@4";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "../_shared/run-id.ts";

const corsHeaders = {
  ...baseCors,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const EXCLUDED_AREA = "control temperatura";
const PROFILES = new Set(["MonCon", "AdC", "lectura"]);
const STATUS_SCORE: Record<string, number> = {
  "Satisfactorio": 1, "Seguimiento": 2, "Alerta": 3, "Crítico": 4, "Sin medición": 0,
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INSTRUCTIONS = `Eres Vig-IA, el asistente de monitoreo de condiciones de SIMCON (Minera Los Pelambres, Superintendencia Confiabilidad y Mejoramiento TFT y Puerto).
Respondes en español, de forma clara y breve, para analistas de mantenimiento.
Reglas:
- Usa SIEMPRE las herramientas para obtener datos reales antes de responder sobre equipos, estados, informes o temperaturas. Nunca inventes TAGs, fechas, avisos ni valores.
- Estados posibles: Satisfactorio, Seguimiento, Alerta, Crítico, Sin medición.
- Para resúmenes de historial: indica la evolución de la condición, los diagnósticos principales, avisos SAP y OT relevantes.
- Cuando el usuario pida un gráfico (o ayude a entender una tendencia), llama a serie_grafico; el gráfico se mostrará automáticamente en el chat, no lo describas con tablas ASCII.
- Recomendaciones: sepáralas en "Según los informes" (basadas en diagnósticos/recomendaciones registradas) y "Sugerencia adicional de Vig-IA" (criterio general de confiabilidad: técnicas complementarias, frecuencia de inspección, priorización). Deja claro qué parte no proviene de los datos.
- Si no encuentras datos, dilo.
- Usa markdown con listas y tablas pequeñas cuando ayuden.`;

type Eq = { id: string; tag: string; name: string; criticality: string; area: string; system: string };

async function loadEquipment(sb: SupabaseClient): Promise<Eq[]> {
  const out: Eq[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("equipment")
      .select("id, tag, name, criticality, systems!inner(name, areas!inner(name))")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      // deno-lint-ignore no-explicit-any
      const s: any = (r as any).systems;
      const area = s?.areas?.name ?? "";
      if (area.toLowerCase().includes(EXCLUDED_AREA)) continue;
      out.push({ id: r.id, tag: r.tag, name: r.name, criticality: r.criticality, area, system: s?.name ?? "" });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function latestStatuses(sb: SupabaseClient, ids: string[]) {
  const map = new Map<string, { status: string; week: number; year: number; aviso: string | null; ot: string | null; descripcion: string | null }>();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const { data, error } = await sb
      .from("weekly_reports")
      .select("equipment_id, status, week_number, year, sap_notification, sap_order, technical_description")
      .in("equipment_id", chunk)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      if (!map.has(r.equipment_id)) {
        map.set(r.equipment_id, {
          status: r.status, week: r.week_number, year: r.year,
          aviso: r.sap_notification, ot: r.sap_order, descripcion: r.technical_description,
        });
      }
    }
  }
  return map;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function buildTools(sb: SupabaseClient) {
  let eqCache: Eq[] | null = null;
  const equipment = async () => (eqCache ??= await loadEquipment(sb));
  const findByTag = async (tag: string) => {
    const all = await equipment();
    const t = norm(tag.trim());
    return all.find((e) => norm(e.tag) === t) ?? all.find((e) => norm(e.tag).includes(t));
  };

  return {
    buscar_equipos: tool({
      description: "Busca equipos por TAG o nombre y/o filtra por área y estado actual (última semana registrada). Devuelve hasta 60 equipos.",
      inputSchema: z.object({
        texto: z.string().nullable().describe("TAG o parte del nombre; null para no filtrar"),
        area: z.string().nullable().describe("Área, ej. Puerto, Transporte Fluidos, Tranque Mauro, Desaladora"),
        estado: z.enum(["Satisfactorio", "Seguimiento", "Alerta", "Crítico", "Sin medición"]).nullable(),
      }),
      execute: async ({ texto, area, estado }) => {
        let list = await equipment();
        if (texto) { const t = norm(texto); list = list.filter((e) => norm(e.tag).includes(t) || norm(e.name).includes(t)); }
        if (area) { const a = norm(area); list = list.filter((e) => norm(e.area).includes(a)); }
        const st = await latestStatuses(sb, list.map((e) => e.id));
        let rows = list.map((e) => ({ tag: e.tag, nombre: e.name, area: e.area, sistema: e.system, criticidad: e.criticality, ...st.get(e.id) }));
        if (estado) rows = rows.filter((r) => r.status === estado);
        return { total: rows.length, equipos: rows.slice(0, 60) };
      },
    }),
    historial_equipo: tool({
      description: "Historial de un equipo por TAG: estados semanales recientes e informes técnicos con diagnóstico y recomendación.",
      inputSchema: z.object({
        tag: z.string(),
        semanas: z.number().int().min(1).max(104).nullable().describe("Cantidad de semanas recientes; null = 26"),
      }),
      execute: async ({ tag, semanas }) => {
        const eq = await findByTag(tag);
        if (!eq) return { error: `No se encontró el equipo ${tag}` };
        const n = semanas ?? 26;
        const [{ data: weeks }, { data: reps }] = await Promise.all([
          sb.from("weekly_reports").select("week_number, year, status, sap_notification, sap_order, technical_description, planned_date")
            .eq("equipment_id", eq.id).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(n),
          sb.from("reports").select("id, tipo, fecha_informe, week_number, year, status_resultante, hallazgos, recomendacion, aviso_sap, ot_numero, report_items(componente, condicion, diagnostico, recomendacion, aviso_sap)")
            .eq("equipment_id", eq.id).order("fecha_informe", { ascending: false }).limit(15),
        ]);
        return { equipo: eq, semanas: weeks ?? [], informes: (reps ?? []).map(({ id: _id, ...r }) => r) };
      },
    }),
    resumen_estados: tool({
      description: "Conteo de equipos por estado actual (última semana registrada por equipo), opcionalmente por área, desglosado por área.",
      inputSchema: z.object({ area: z.string().nullable() }),
      execute: async ({ area }) => {
        let list = await equipment();
        if (area) { const a = norm(area); list = list.filter((e) => norm(e.area).includes(a)); }
        const st = await latestStatuses(sb, list.map((e) => e.id));
        const byArea: Record<string, Record<string, number>> = {};
        for (const e of list) {
          const s = st.get(e.id)?.status ?? "Sin registro";
          (byArea[e.area] ??= {})[s] = (byArea[e.area][s] ?? 0) + 1;
        }
        return { total_equipos: list.length, por_area: byArea };
      },
    }),
    spools_temperatura: tool({
      description: "Lecturas ΔT de spools del sistema STC o STR. Filtra por estación (código, ej. KM39) o TAG de spool. Devuelve la última semana y los mayores deltas.",
      inputSchema: z.object({
        sistema: z.enum(["stc", "str"]),
        estacion: z.string().nullable(),
        tag: z.string().nullable(),
      }),
      execute: async ({ sistema, estacion, tag }) => {
        let q = sb.from(`${sistema}_temperature_readings`)
          .select(`week_number, year, delta_t, ${sistema}_spools!inner(tag, ${sistema}_stations!inner(code))`)
          .not("delta_t", "is", null).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(3000);
        if (tag) q = q.ilike(`${sistema}_spools.tag`, `%${tag}%`);
        if (estacion) q = q.ilike(`${sistema}_spools.${sistema}_stations.code`, `%${estacion}%`);
        const { data, error } = await q;
        if (error) return { error: error.message };
        // deno-lint-ignore no-explicit-any
        const rows = (data ?? []).map((r: any) => ({ semana: r.week_number, anio: r.year, delta_t: Number(r.delta_t), spool: r[`${sistema}_spools`]?.tag, estacion: r[`${sistema}_spools`]?.[`${sistema}_stations`]?.code }));
        if (!rows.length) return { lecturas: [] };
        const last = rows[0];
        const ultima = rows.filter((r) => r.semana === last.semana && r.anio === last.anio).sort((a, b) => b.delta_t - a.delta_t);
        return { rangos: "Verde 0–2,4 · Amarillo 2,5–2,9 · Naranja 3–3,4 · Rojo ≥3,5", ultima_semana: `${last.semana}/${last.anio}`, mayores_delta: ultima.slice(0, 15), historial: tag ? rows.slice(0, 30) : undefined };
      },
    }),
    serie_grafico: tool({
      description: "Genera datos de un gráfico que el chat dibuja. tipo: 'estado_equipo' (evolución semanal del estado de un TAG, escala 0=Sin medición,1=Satisfactorio,2=Seguimiento,3=Alerta,4=Crítico), 'conteo_estados' (equipos por estado actual, opcional área), 'delta_spool' (ΔT semanal de un spool STC/STR).",
      inputSchema: z.object({
        tipo: z.enum(["estado_equipo", "conteo_estados", "delta_spool"]),
        tag: z.string().nullable().describe("TAG de equipo o spool"),
        area: z.string().nullable(),
        sistema: z.enum(["stc", "str"]).nullable(),
        semanas: z.number().int().min(2).max(104).nullable(),
      }),
      execute: async ({ tipo, tag, area, sistema, semanas }) => {
        const n = semanas ?? 26;
        if (tipo === "estado_equipo") {
          if (!tag) return { error: "Falta el TAG" };
          const eq = await findByTag(tag);
          if (!eq) return { error: `No se encontró ${tag}` };
          const { data } = await sb.from("weekly_reports").select("week_number, year, status")
            .eq("equipment_id", eq.id).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(n);
          const pts = (data ?? []).reverse().map((r) => ({ x: `S${r.week_number}/${String(r.year).slice(2)}`, y: STATUS_SCORE[r.status] ?? 0, label: r.status }));
          return { chart: { kind: "status", title: `Estado semanal ${eq.tag}`, yLabel: "Estado", data: pts } };
        }
        if (tipo === "conteo_estados") {
          let list = await equipment();
          if (area) { const a = norm(area); list = list.filter((e) => norm(e.area).includes(a)); }
          const st = await latestStatuses(sb, list.map((e) => e.id));
          const counts: Record<string, number> = {};
          for (const e of list) { const s = st.get(e.id)?.status ?? "Sin registro"; counts[s] = (counts[s] ?? 0) + 1; }
          const order = ["Crítico", "Alerta", "Seguimiento", "Satisfactorio", "Sin medición", "Sin registro"];
          return { chart: { kind: "bar", title: `Equipos por estado${area ? ` – ${area}` : ""}`, yLabel: "Equipos", data: order.filter((k) => counts[k]).map((k) => ({ x: k, y: counts[k] })) } };
        }
        if (!tag || !sistema) return { error: "Falta TAG del spool o sistema" };
        const { data, error } = await sb.from(`${sistema}_temperature_readings`)
          .select(`week_number, year, delta_t, ${sistema}_spools!inner(tag)`).ilike(`${sistema}_spools.tag`, tag)
          .not("delta_t", "is", null).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(n);
        if (error) return { error: error.message };
        const pts = (data ?? []).reverse().map((r) => ({ x: `S${r.week_number}/${String(r.year).slice(2)}`, y: Number(r.delta_t) }));
        return { chart: { kind: "line", title: `ΔT ${tag.toUpperCase()} (${sistema.toUpperCase()})`, yLabel: "ΔT °C", data: pts } };
      },
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);

  try {
    if (req.method === "GET" || req.method === "DELETE") {
      const profile = url.searchParams.get("profile") ?? "";
      if (!PROFILES.has(profile)) return json({ error: "Perfil inválido" }, 400);
      if (req.method === "DELETE") {
        const { error } = await sb.from("vig_ia_messages").delete().eq("profile_key", profile);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      const { data, error } = await sb.from("vig_ia_messages").select("message").eq("profile_key", profile).order("created_at").limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ messages: (data ?? []).map((r) => r.message) });
    }
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

    const Body = z.object({ profile: z.string(), messages: z.array(z.any()).min(1).max(200) });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success || !PROFILES.has(parsed.data.profile)) return json({ error: "Solicitud inválida" }, 400);
    const { profile } = parsed.data;
    const messages = parsed.data.messages as UIMessage[];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Falta configurar Lovable AI" }, 500);

    // Guardar el mensaje del usuario antes de responder.
    const lastUser = messages[messages.length - 1];
    if (lastUser?.role === "user") {
      const { error } = await sb.from("vig_ia_messages").upsert(
        { profile_key: profile, message_id: lastUser.id, message: lastUser },
        { onConflict: "profile_key,message_id" },
      );
      if (error) console.error("No se pudo guardar el mensaje del usuario:", error.message);
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const provider = createOpenAI({
      baseURL: GATEWAY_URL,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const tools = buildTools(sb);
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      messages: await convertToModelMessages(messages, { tools }),
      tools,
      stopWhen: stepCountIs(8),
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const response = result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      headers: corsHeaders,
      onFinish: async ({ responseMessage }) => {
        const { error } = await sb.from("vig_ia_messages").upsert(
          { profile_key: profile, message_id: responseMessage.id, message: responseMessage },
          { onConflict: "profile_key,message_id" },
        );
        if (error) console.error("No se pudo guardar la respuesta:", error.message);
      },
      onError: (error) => {
        console.error("vig-ia error:", error);
        // deno-lint-ignore no-explicit-any
        const e = error as any;
        const status = e?.statusCode ?? e?.status;
        if (status === 402) return "Sin créditos de Lovable AI. Agrega créditos en Settings → Plans & credits.";
        if (status === 429) return "Demasiadas consultas en este momento. Intenta de nuevo en un minuto.";
        if (status === 403) return "El acceso a Lovable AI está bloqueado para este espacio de trabajo.";
        return e?.message ?? "Error al generar la respuesta";
      },
    });
    return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error interno" }, 500);
  }
});
