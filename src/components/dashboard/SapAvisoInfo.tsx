import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lookupAvisos, normAviso } from "@/lib/sapLookup";

/** Muestra OTs asociadas (IW39) y estado del aviso (IW29) consultando SAP en vivo. */
export function SapAvisoInfo({ aviso }: { aviso: string }) {
  const key = normAviso(aviso);
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["sap-lookup", key],
    queryFn: async () => (await lookupAvisos([key]))[key] ?? null,
    enabled: /^\d+$/.test(key),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SAP · Órdenes asociadas al aviso</p>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">Actualizar desde SAP</span>
        </Button>
      </div>
      {error ? (
        <p className="text-destructive text-xs">No se pudo consultar SAP.</p>
      ) : data === null ? (
        <p className="text-muted-foreground italic text-xs">Aviso no encontrado en IW29/IW39.</p>
      ) : data ? (
        <>
          {data.descripcion_aviso && (
            <p className="text-xs text-muted-foreground">
              {data.descripcion_aviso}
              {data.status_aviso && <span className="ml-2 font-mono">[{data.status_aviso}]</span>}
            </p>
          )}
          {data.ordenes.length ? (
            <ul className="space-y-1">
              {data.ordenes.map((o) => (
                <li key={o.orden ?? ""} className="flex flex-wrap gap-x-3 font-mono text-xs">
                  <span className="text-foreground font-semibold">OT {o.orden}</span>
                  <span>Inicio extremo: {o.fecha_inicio_extrema ? new Date(o.fecha_inicio_extrema + "T00:00").toLocaleDateString("es-CL") : "—"}</span>
                  {o.status && <span className="text-muted-foreground">{o.status}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin OT en IW39{data.orden_iw29 ? ` (IW29 indica OT ${data.orden_iw29})` : ""}.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
