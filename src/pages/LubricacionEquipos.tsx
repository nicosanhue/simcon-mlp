import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Droplet, Search, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import data from "@/data/lubricacionEquipos.json";

type Row = {
  seccion: string | null;
  equipo: string | null;
  componente: string | null;
  lubricante_actual: string | null;
  tipo_actual: string | null;
  lubricante_recomendado: string | null;
  tipo_recomendado: string | null;
  volumen: number | string | null;
  unidad: string | null;
  frecuencia?: string | null;
  vaso_lubricador?: string | null;
  periodo?: string | null;
};

type Dataset = Record<string, Row[]>;
const dataset = data as Dataset;
const sheets = Object.keys(dataset);

// Color palette similar to status cards (soft bg + colored accents)
const TAB_COLORS = [
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", active: "bg-emerald-500 text-white border-emerald-500" },
  { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", active: "bg-sky-500 text-white border-sky-500" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", active: "bg-amber-500 text-white border-amber-500" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", active: "bg-rose-500 text-white border-rose-500" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", active: "bg-violet-500 text-white border-violet-500" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", active: "bg-teal-500 text-white border-teal-500" },
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", active: "bg-indigo-500 text-white border-indigo-500" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", active: "bg-orange-500 text-white border-orange-500" },
];

function fmt(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function LubricacionTable({ rows }: { rows: Row[] }) {
  const hasSections = rows.some((r) => r.seccion);
  const showPeriodo = rows.some((r) => r.vaso_lubricador && String(r.vaso_lubricador).trim() !== "");

  const groups = useMemo(() => {
    if (!hasSections) return [{ name: null as string | null, rows }];
    const map = new Map<string | null, Row[]>();
    rows.forEach((r) => {
      const key = r.seccion ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
  }, [rows, hasSections]);

  return (
    <div className="space-y-6">
      {groups.map((g, gi) => {
        // Compute rowspans for equipo column
        const spans: number[] = [];
        for (let i = 0; i < g.rows.length; i++) {
          if (i > 0 && g.rows[i].equipo === g.rows[i - 1].equipo) {
            spans.push(0);
          } else {
            let n = 1;
            while (i + n < g.rows.length && g.rows[i + n].equipo === g.rows[i].equipo) n++;
            spans.push(n);
          }
        }
        return (
          <div key={gi}>
            {g.name && (
              <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wide">
                {g.name}
              </h3>
            )}
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Equipo</TableHead>
                    <TableHead className="font-semibold">Componente</TableHead>
                    <TableHead className="font-semibold">Lubricante actual</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Lubricante recomendado</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold text-right">Cantidad</TableHead>
                    <TableHead className="font-semibold">Unidad</TableHead>
                    <TableHead className="font-semibold">Frecuencia</TableHead>
                    <TableHead className="font-semibold">Vaso lubricador</TableHead>
                    {showPeriodo && <TableHead className="font-semibold">Periodo</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.map((r, i) => {
                    const span = spans[i];
                    const isNewEquipo = span > 0;
                    return (
                      <TableRow
                        key={i}
                        className={isNewEquipo && i > 0 ? "border-t-2 border-t-primary/20" : ""}
                      >
                        {isNewEquipo && (
                          <TableCell
                            rowSpan={span}
                            className="font-medium align-middle bg-muted/20"
                          >
                            <Badge variant="outline" className="border-primary/40 text-primary">
                              {fmt(r.equipo)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{fmt(r.componente)}</TableCell>
                        <TableCell>{fmt(r.lubricante_actual)}</TableCell>
                        <TableCell>
                          {r.tipo_actual ? <Badge variant="secondary" className="text-xs">{r.tipo_actual}</Badge> : "—"}
                        </TableCell>
                        <TableCell>{fmt(r.lubricante_recomendado)}</TableCell>
                        <TableCell>
                          {r.tipo_recomendado ? <Badge variant="secondary" className="text-xs">{r.tipo_recomendado}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.volumen)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{fmt(r.unidad)}</TableCell>
                        <TableCell>{fmt(r.frecuencia)}</TableCell>
                        <TableCell>{fmt(r.vaso_lubricador)}</TableCell>
                        {showPeriodo && <TableCell>{fmt(r.periodo)}</TableCell>}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LubricacionEquipos() {
  const [search, setSearch] = useState("");
  const [equipoFilter, setEquipoFilter] = useState("");
  const [activeTab, setActiveTab] = useState(sheets[0]);

  const filteredRows = useMemo(() => {
    const rows = dataset[activeTab] || [];
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.equipo, r.componente, r.lubricante_actual, r.lubricante_recomendado, r.tipo_actual, r.tipo_recomendado, r.seccion]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    const eq = equipoFilter.trim().toLowerCase();
    if (eq) {
      out = out.filter((r) => r.equipo && String(r.equipo).toLowerCase().includes(eq));
    }
    return out;
  }, [activeTab, search, equipoFilter]);

  const totalRows = Object.values(dataset).reduce((s, r) => s + r.length, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Droplet className="h-6 w-6 text-primary" />
              Lubricación Equipos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Levantamiento de equipos lubricados — {totalRows} componentes en {sheets.length} áreas
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Búsqueda general (equipo, componente, lubricante...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo por área</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs as status-style chips */}
            <div className="flex flex-wrap gap-2">
              {sheets.map((s, idx) => {
                const c = TAB_COLORS[idx % TAB_COLORS.length];
                const isActive = s === activeTab;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveTab(s)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? cn(c.active, "shadow-sm")
                        : cn(c.bg, c.text, c.border, "hover:shadow-sm")
                    )}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{s}</span>
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        isActive ? "bg-white/25 text-white" : "bg-white/70"
                      )}
                    >
                      {dataset[s].length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Equipment quick filter for active tab */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Filtrar equipo en ${activeTab}...`}
                  value={equipoFilter}
                  onChange={(e) => setEquipoFilter(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredRows.length} componentes
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin resultados
              </p>
            ) : (
              <LubricacionTable rows={filteredRows} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
