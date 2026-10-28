import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildDocument, mergeLive, minutesSince, parseTemplate, type C370Live } from "@/lib/concentraducto370";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/concentraducto-370`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Concentraducto370() {
  const template = useQuery({
    queryKey: ["c370-template"],
    queryFn: async () => (await fetch("/concentraducto-370.html")).text(),
    staleTime: Infinity,
  });
  const live = useQuery({
    queryKey: ["c370-live"],
    queryFn: async () => {
      const res = await fetch(FN_URL, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      return body as C370Live;
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const base = useMemo(() => (template.data ? parseTemplate(template.data) : null), [template.data]);
  const data = useMemo(() => (base ? mergeLive(base, live.data ?? null) : null), [base, live.data]);
  const srcDoc = useMemo(() => (template.data && data ? buildDocument(template.data, data) : undefined), [template.data, data]);

  const piAge = minutesSince(live.data?.pi?.snap);
  const piStale = piAge != null && piAge > 120;
  const errs = [
    live.error && `No se pudo leer Databricks (${(live.error as Error).message}). Se muestra la foto del ${fmt(base?.snap)}.`,
    live.data?.errors.pi && `PI no respondió: se muestran los valores de la foto del ${fmt(base?.snap)}.`,
    live.data?.errors.sap && `SAP no respondió: avisos y OT corresponden a la foto del ${fmt(base?.sapIng)}.`,
    piStale && `El último dato PI tiene ${Math.round(piAge! / 60)} h de antigüedad.`,
  ].filter(Boolean) as string[];

  return (
    <MainLayout>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Concentraducto 370</h1>
            <p className="text-sm text-muted-foreground">
              PI: {live.isLoading ? "cargando…" : fmt(data?.snap)} · SAP (IW29/IW39): {live.isLoading ? "cargando…" : fmt(data?.sapIng)} · se actualiza cada 5 min
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch(`${FN_URL}?force=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).catch(() => {});
              live.refetch();
            }}
            disabled={live.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${live.isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        {errs.map((e) => (
          <Alert key={e} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{e}</AlertDescription>
          </Alert>
        ))}
        {srcDoc && !live.isLoading ? (
          <iframe
            title="Concentraducto 370"
            srcDoc={srcDoc}
            className="h-[calc(100vh-12rem)] w-full rounded-lg border border-border bg-card"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Leyendo PI y SAP…
          </div>
        )}
      </div>
    </MainLayout>
  );
}
