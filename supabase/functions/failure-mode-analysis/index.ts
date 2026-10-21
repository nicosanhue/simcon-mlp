import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY no está configurada" }, 500);
    const { mode, period, diagnoses } = await req.json();
    if (typeof mode !== "string" || !Array.isArray(diagnoses) || !diagnoses.length)
      return json({ error: "Faltan el modo de falla o los diagnósticos" }, 400);

    const lines = diagnoses.slice(0, 200).map((d: any, i: number) =>
      `${i + 1}. [${d.tag} | ${d.area} | S${d.week?.week}/${d.week?.year} | ${d.componente} | ${d.condicion}] ${String(d.text).slice(0, 800)}`
    ).join("\n");

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system:
        "Eres un especialista senior en monitoreo de condición (vibraciones, termografía, ultrasonido, lubricación) de una minera. " +
        "Responde en español, en Markdown, conciso y técnico. Basa todo solo en los diagnósticos entregados; cita los TAG. " +
        "Estructura: ## Resumen, ## Patrones recurrentes (equipos/componentes/áreas repetidos, evolución por semana, causas probables), " +
        "## Equipos prioritarios (tabla TAG | motivo | prioridad), ## Acciones de inspección sugeridas (concretas: técnica, punto, frecuencia), ## Limitaciones de los datos.",
      messages: [{ role: "user", content: `Modo de falla: ${mode}\nPeríodo: ${period}\nDiagnósticos (${diagnoses.length}):\n${lines}` }],
      abortSignal: req.signal,
      providerOptions: {
        openai: { store: false, forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
      },
    });
    const text = await result.text;
    if (!text.trim()) return json({ error: "El modelo no entregó una respuesta." }, 502);
    return json({ analysis: text });
  } catch (e: any) {
    if (e?.name === "AbortError") return new Response(null, { status: 499, headers: cors });
    const status = e?.statusCode ?? e?.lastError?.statusCode ?? 500;
    const msg = status === 402 ? "Sin créditos de IA disponibles. Agrega créditos en Settings → Plans & credits."
      : status === 429 ? "Demasiadas solicitudes; intenta en un momento."
      : e?.message || "Error al analizar";
    return json({ error: msg }, status);
  }
});
