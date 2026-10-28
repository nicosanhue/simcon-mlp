import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnexReport, useEnexLinks } from "@/hooks/useEnexReport";
import { SapStateBadge } from "@/components/enex/SapStateBadge";
import { coverage } from "@/lib/enexReport";

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Condiciones de lubricación ENEX (Crítico/Alerta) asociadas a equipos SIMCON, con su aviso/OT MonCon. */
export function LubricacionEnexPanel({ searchTerm = "", className = "" }: { searchTerm?: string; className?: string }) {
  const live = useEnexReport();
  const links = useEnexLinks(live.data);
  const eq = useQuery({
    queryKey: ["equipment-tags-lub"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("tag, name, systems(name, areas(name))");
      if (error) throw error;
      return (data ?? []).filter((e) => (e.systems as { areas?: { name?: string } } | null)?.areas?.name !== "Control Temperatura");
    },
    staleTime: 10 * 60_000,
  });

  const rows = useMemo(() => {
    const byTag = new Map((eq.data ?? []).map((e) => [norm(e.tag), e]));
    const s = searchTerm.trim().toLowerCase();
    return links
      .map((x) => {
        const t = norm(x.row.tag);
        const e = byTag.get(t) ?? byTag.get(t.replace(/[A-Z]$/, ""));
        return { ...x, equipo: e ?? null };
      })
      .filter((x) => !s || `${x.row.tag} ${x.equipo?.name ?? ""} ${x.row.equipment}`.toLowerCase().includes(s));
  }, [links, eq.data, searchTerm]);
  const cov = coverage(rows.map((r) => r.link));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Droplets className="h-4 w-4 text-primary" />Lubricación (ENEX + SAP)</CardTitle>
          <p className="text-xs text-muted-foreground">
            {cov.total} condiciones en Crítico/Alerta · {cov.SIN_AVISO} sin aviso · {cov.OT_ABIERTA} con OT abierta · {cov.EJECUTADO} ejecutadas
          </p>
        </div>
        <Link to="/reporte-enex" className="text-sm font-medium text-primary hover:underline">Ver Reporte ENEX</Link>
      </CardHeader>
      <CardContent className="max-h-[360px] overflow-auto p-0">
        {live.isLoading || eq.isLoading ? <Skeleton className="m-4 h-40" /> : live.error ? (
          <p className="p-4 text-sm text-muted-foreground">No se pudo leer el Reporte ENEX.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2">TAG</th><th className="px-4 py-2">Equipo SIMCON</th><th className="px-4 py-2">Condición ENEX</th><th className="px-4 py-2">Informe</th><th className="px-4 py-2">Lubricación</th><th className="px-4 py-2">Aviso / OT</th><th className="px-4 py-2">Inicio extremo</th></tr>
            </thead>
            <tbody>
              {rows.map(({ row, link, equipo }) => (
                <tr key={row.tag} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono font-medium">{row.tag}</td>
                  <td className="px-4 py-2">{equipo ? equipo.name : <span className="text-muted-foreground">No registrado</span>}</td>
                  <td className="px-4 py-2">{row.status === "CRITICO" ? "Crítico" : "Alerta"}</td>
                  <td className="px-4 py-2 tabular-nums">{row.date}</td>
                  <td className="px-4 py-2"><SapStateBadge state={link.state} /></td>
                  <td className="px-4 py-2 font-mono text-xs" title={link.aviso?.descripcion ?? ""}>{link.aviso ? `${link.aviso.aviso}${link.aviso.orden ? ` / ${link.aviso.orden}` : ""}` : "—"}</td>
                  <td className="px-4 py-2 tabular-nums">{link.aviso?.fecha_inicio_extrema ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sin condiciones de lubricación.</td></tr>}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
