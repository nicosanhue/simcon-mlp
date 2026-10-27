import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { RotateCcw, Search, FileText, BarChart3, Thermometer, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { VigiaChart, type VigiaChartData } from "@/components/vigia/VigiaChart";
import { useProfile } from "@/contexts/ProfileContext";
import vigiaLogo from "@/assets/vig-ia-logo.png";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vig-ia`;
const AUTH_HEADERS = {
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

const TOOL_LABELS: Record<string, { label: string; icon: typeof Search }> = {
  buscar_equipos: { label: "Buscando equipos", icon: Search },
  historial_equipo: { label: "Revisando historial e informes", icon: FileText },
  resumen_estados: { label: "Contando estados", icon: ListChecks },
  spools_temperatura: { label: "Leyendo temperaturas de spools", icon: Thermometer },
  serie_grafico: { label: "Preparando gráfico", icon: BarChart3 },
};

const SUGGESTIONS = [
  "¿Qué equipos están en estado Crítico o Alerta?",
  "Grafica los equipos por estado en Puerto",
  "¿Qué spools del STC tienen el mayor ΔT esta semana?",
  "Recomienda prioridades de inspección para la próxima semana",
];

function VigiaChat({ profileKey, initialMessages, initialInput }: { profileKey: string; initialMessages: UIMessage[]; initialInput: string }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: FN_URL,
        headers: AUTH_HEADERS,
        body: { profile: profileKey },
      }),
    [profileKey],
  );
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: `vig-ia-${profileKey}`,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "No se pudo conectar con Vig-IA"),
  });
  const busy = status === "submitted" || status === "streaming";

  const reset = async () => {
    if (busy) stop();
    const res = await fetch(`${FN_URL}?profile=${profileKey}`, { method: "DELETE", headers: AUTH_HEADERS });
    if (!res.ok) {
      toast.error("No se pudo borrar la conversación");
      return;
    }
    setMessages([]);
  };

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col rounded-xl border border-border bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={vigiaLogo} alt="Vig-IA" className="h-10 w-10 object-contain" width={40} height={40} />
          <div>
            <p className="text-base font-semibold text-foreground">Vig-IA</p>
            <p className="text-xs text-muted-foreground">Asistente de monitoreo de condiciones · solo lectura</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={!messages.length}>
          <RotateCcw className="mr-2 h-4 w-4" /> Nueva conversación
        </Button>
      </div>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
              <img src={vigiaLogo} alt="" className="h-28 w-28 object-contain" width={112} height={112} />
              <p className="text-sm text-muted-foreground">
                Pregúntame por un equipo, pídeme un resumen de su historial de informes, un gráfico o recomendaciones.
              </p>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" className="h-auto whitespace-normal py-2 text-left text-xs" onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent
                className={
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "w-full max-w-full bg-transparent text-foreground"
                }
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                    ) : (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    // deno-lint-ignore no-explicit-any
                    const tp = part as any;
                    const name = part.type.slice(5);
                    const meta = TOOL_LABELS[name];
                    const chart: VigiaChartData | undefined =
                      name === "serie_grafico" && tp.state === "output-available" ? tp.output?.chart : undefined;
                    return (
                      <div key={i} className="space-y-2">
                        <Tool defaultOpen={false}>
                          <ToolHeader type={tp.type} state={tp.state} title={meta?.label ?? name} />
                          <ToolContent>
                            <ToolInput input={tp.input} />
                            <ToolOutput output={tp.output} errorText={tp.errorText} />
                          </ToolContent>
                        </Tool>
                        {chart && <VigiaChart chart={chart} />}
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent className="bg-transparent">
                <Shimmer>Vig-IA está revisando los datos…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && status === "error" && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInputProvider initialInput={initialInput}>
          <PromptInput onSubmit={({ text }) => send(text)}>
            <PromptInputTextarea autoFocus placeholder="Pregunta sobre un equipo, un TAG, un área o un spool…" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={stop} disabled={status === "ready" ? false : !busy} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}

export default function VigIA() {
  const { profile } = useProfile();
  const profileKey = profile ?? "lectura";
  const [params] = useSearchParams();
  const tag = params.get("tag");
  const initialInput = tag ? `Resume el historial de ${tag} y dame recomendaciones` : "";
  const [loaded, setLoaded] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    fetch(`${FN_URL}?profile=${profileKey}`, { headers: AUTH_HEADERS })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? "Error");
        return r.json();
      })
      .then((d) => !cancelled && setLoaded(d.messages ?? []))
      .catch((e) => {
        if (cancelled) return;
        toast.error(`No se pudo cargar la conversación: ${e.message}`);
        setLoaded([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profileKey]);

  return (
    <div className="space-y-4">
      {loaded === null ? (
        <div className="flex h-64 items-center justify-center">
          <Shimmer>Cargando conversación…</Shimmer>
        </div>
      ) : (
        <VigiaChat key={`${profileKey}-${tag ?? ""}`} profileKey={profileKey} initialMessages={loaded} initialInput={initialInput} />
      )}
    </div>
  );
}
