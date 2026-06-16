import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Droplet, Search } from "lucide-react";
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
};

type Dataset = Record<string, Row[]>;
const dataset = data as Dataset;
const sheets = Object.keys(dataset);

function fmt(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function LubricacionTable({ rows }: { rows: Row[] }) {
  // Group by section if any section is present
  const hasSections = rows.some((r) => r.seccion);
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
      {groups.map((g, gi) => (
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
                  <TableHead className="font-semibold text-right">Volumen</TableHead>
                  <TableHead className="font-semibold">Unidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.rows.map((r, i) => {
                  const prev = g.rows[i - 1];
                  const showEquipo = !prev || prev.equipo !== r.equipo;
                  return (
                    <TableRow key={i} className={showEquipo && i > 0 ? "border-t-2 border-t-primary/20" : ""}>
                      <TableCell className="font-medium">
                        {showEquipo ? <Badge variant="outline">{fmt(r.equipo)}</Badge> : null}
                      </TableCell>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LubricacionEquipos() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(sheets[0]);

  const filteredRows = useMemo(() => {
    const rows = dataset[activeTab] || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.equipo, r.componente, r.lubricante_actual, r.lubricante_recomendado, r.tipo_actual, r.tipo_recomendado, r.seccion]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeTab, search]);

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
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipo, componente, lubricante..."
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
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto justify-start">
                {sheets.map((s) => (
                  <TabsTrigger key={s} value={s} className="text-xs">
                    {s}
                    <span className="ml-2 text-muted-foreground">({dataset[s].length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {sheets.map((s) => (
                <TabsContent key={s} value={s} className="mt-4">
                  {s === activeTab && (
                    <>
                      {filteredRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          Sin resultados para "{search}"
                        </p>
                      ) : (
                        <LubricacionTable rows={filteredRows} />
                      )}
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
