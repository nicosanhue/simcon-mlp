import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FAILURE_MODES } from "@/lib/monthlyReport";
import { fetchDiagnoses } from "@/hooks/useMonthlyReport";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function AiFailureAnalysis({ month, year }: { month: number; year: number }) {
  const [mode, setMode] = useState<string>("Rodamiento");
  const [from, setFrom] = useState(iso(new Date(Date.UTC(year, month - 1, 1))));
  const [to, setTo] = useState(iso(new Date(Date.UTC(year, month, 0))));
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true); setError(""); setResult(""); setCount(null);
    try {
      const end = iso(new Date(new Date(to + "T00:00:00Z").getTime() + 86400000));
      const all = await fetchDiagnoses(from, end);
      const diagnoses = all.filter((d) => d.modes.includes(mode));
      setCount(diagnoses.length);
      if (!diagnoses.length) { setError("No hay diagnósticos de ese modo de falla en el período."); return; }
      const { data, error } = await supabase.functions.invoke("failure-mode-analysis", {
        body: { mode, period: `${from} a ${to}`, diagnoses },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* keep */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setResult(data.analysis);
    } catch (e: any) {
      setError(e.message || "No se pudo completar el análisis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="industrial-panel p-4 space-y-3">
      <h2 className="font-semibold text-primary flex items-center gap-2"><Brain className="h-4 w-4" /> Análisis con IA por modo de falla</h2>
      <p className="text-xs text-muted-foreground">Elige un modo de falla y un período. La IA revisa los diagnósticos de los informes y sugiere patrones recurrentes y acciones de inspección.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs space-y-1">Modo de falla
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{FAILURE_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-xs space-y-1">Desde<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></label>
        <label className="text-xs space-y-1">Hasta<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></label>
        <Button onClick={run} disabled={busy || !from || !to || from > to}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analizando…</> : "Analizar"}
        </Button>
      </div>
      {count !== null && <p className="text-xs text-muted-foreground">{count} diagnósticos encontrados para {mode}.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="text-sm space-y-2 border rounded p-3 bg-card [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-3 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:border-b [&_th]:p-1 [&_td]:border-b [&_td]:p-1 [&_strong]:font-semibold">
          <ReactMarkdown>{result}</ReactMarkdown>
          <p className="text-xs text-muted-foreground italic">Sugerencia generada con IA a partir de los diagnósticos; revísala antes de tomar decisiones.</p>
        </div>
      )}
    </section>
  );
}
