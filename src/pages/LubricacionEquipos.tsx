import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Droplet, Search, Layers, Pencil, History, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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

type EditableFields = Pick<
  Row,
  | "lubricante_recomendado"
  | "tipo_recomendado"
  | "volumen"
  | "unidad"
  | "frecuencia"
  | "vaso_lubricador"
  | "periodo"
>;

type HistoryEntry = {
  at: string;
  before: EditableFields;
  after: EditableFields;
};

type Overrides = Record<string, EditableFields>;
type HistoryMap = Record<string, HistoryEntry[]>;

type Dataset = Record<string, Row[]>;
const dataset = data as Dataset;
const sheets = Object.keys(dataset);

const STORAGE_OVERRIDES = "lubricacion.overrides.v1";
const STORAGE_HISTORY = "lubricacion.history.v1";

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

function rowKey(tab: string, r: Row, idx: number) {
  return `${tab}::${r.equipo ?? ""}::${r.componente ?? ""}::${idx}`;
}

function pickEditable(r: Row): EditableFields {
  return {
    lubricante_recomendado: r.lubricante_recomendado ?? null,
    tipo_recomendado: r.tipo_recomendado ?? null,
    volumen: r.volumen ?? null,
    unidad: r.unidad ?? null,
    frecuencia: r.frecuencia ?? null,
    vaso_lubricador: r.vaso_lubricador ?? null,
    periodo: r.periodo ?? null,
  };
}

function vasoUses(v: string | null | undefined) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "si" || s === "sí" || s === "yes" || s === "true" || s === "1";
}

function LubricacionTable({
  rows,
  tab,
  overrides,
  history,
  onEdit,
}: {
  rows: Row[];
  tab: string;
  overrides: Overrides;
  history: HistoryMap;
  onEdit: (key: string, row: Row) => void;
}) {
  const hasSections = rows.some((r) => r.seccion);

  // apply overrides
  const merged = rows.map((r, idx) => {
    const k = rowKey(tab, r, idx);
    const ov = overrides[k];
    return { key: k, row: ov ? { ...r, ...ov } : r };
  });

  const showPeriodo = merged.some(({ row }) => vasoUses(row.vaso_lubricador));

  const groups = useMemo(() => {
    if (!hasSections) return [{ name: null as string | null, items: merged }];
    const map = new Map<string | null, typeof merged>();
    merged.forEach((m) => {
      const key = m.row.seccion ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, overrides, tab]);

  const colSpan = 10 + (showPeriodo ? 1 : 0) + 1; // + actions col

  return (
    <div className="space-y-6">
      {groups.map((g, gi) => {
        const items = g.items;
        const spans: number[] = [];
        for (let i = 0; i < items.length; i++) {
          if (i > 0 && items[i].row.equipo === items[i - 1].row.equipo) {
            spans.push(0);
          } else {
            let n = 1;
            while (i + n < items.length && items[i + n].row.equipo === items[i].row.equipo) n++;
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
                    <TableHead className="font-semibold w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m, i) => {
                    const r = m.row;
                    const span = spans[i];
                    const isNewEquipo = span > 0;
                    const hist = history[m.key] ?? [];
                    return (
                      <>
                        <TableRow
                          key={m.key}
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
                          <TableCell>
                            {vasoUses(r.vaso_lubricador) ? (
                              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-sky-200">Sí</Badge>
                            ) : r.vaso_lubricador ? (
                              fmt(r.vaso_lubricador)
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          {showPeriodo && <TableCell>{fmt(r.periodo)}</TableCell>}
                          <TableCell>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onEdit(m.key, r)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {hist.length > 0 && (
                          <TableRow key={m.key + "-hist"} className="bg-muted/10 hover:bg-muted/10">
                            <TableCell colSpan={colSpan} className="py-1">
                              <Collapsible>
                                <CollapsibleTrigger className="group inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                  <History className="h-3 w-3" />
                                  <span>Historial ({hist.length})</span>
                                  <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 space-y-1.5 pl-5">
                                    {hist
                                      .slice()
                                      .reverse()
                                      .map((h, hi) => {
                                        const diffs = (Object.keys(h.before) as (keyof EditableFields)[])
                                          .filter((k) => (h.before[k] ?? "") !== (h.after[k] ?? ""))
                                          .map((k) => ({
                                            field: k,
                                            before: h.before[k],
                                            after: h.after[k],
                                          }));
                                        return (
                                          <div
                                            key={hi}
                                            className="text-[11px] border-l-2 border-primary/30 pl-2 py-0.5"
                                          >
                                            <div className="text-muted-foreground">
                                              {new Date(h.at).toLocaleString()}
                                            </div>
                                            {diffs.length === 0 ? (
                                              <div className="italic text-muted-foreground">Sin cambios</div>
                                            ) : (
                                              <ul className="space-y-0.5">
                                                {diffs.map((d, di) => (
                                                  <li key={di}>
                                                    <span className="font-medium">{d.field}:</span>{" "}
                                                    <span className="line-through text-muted-foreground">
                                                      {fmt(d.before)}
                                                    </span>{" "}
                                                    →{" "}
                                                    <span className="text-foreground font-medium">
                                                      {fmt(d.after)}
                                                    </span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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

  const [overrides, setOverrides] = useState<Overrides>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_OVERRIDES) || "{}");
    } catch {
      return {};
    }
  });
  const [history, setHistory] = useState<HistoryMap>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_OVERRIDES, JSON.stringify(overrides));
  }, [overrides]);
  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  }, [history]);

  const [editing, setEditing] = useState<{ key: string; row: Row } | null>(null);
  const [form, setForm] = useState<EditableFields | null>(null);

  const openEdit = (key: string, row: Row) => {
    setEditing({ key, row });
    setForm(pickEditable(row));
  };
  const closeEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const saveEdit = () => {
    if (!editing || !form) return;
    const before = pickEditable(editing.row);
    // if vaso=No, clear periodo
    const after: EditableFields = vasoUses(form.vaso_lubricador)
      ? form
      : { ...form, periodo: null };

    const changed = (Object.keys(before) as (keyof EditableFields)[]).some(
      (k) => (before[k] ?? "") !== (after[k] ?? "")
    );
    if (!changed) {
      toast({ title: "Sin cambios", description: "No se modificó ningún campo." });
      closeEdit();
      return;
    }

    setOverrides((prev) => ({ ...prev, [editing.key]: after }));
    setHistory((prev) => {
      const list = prev[editing.key] ? [...prev[editing.key]] : [];
      list.push({ at: new Date().toISOString(), before, after });
      return { ...prev, [editing.key]: list };
    });
    toast({ title: "Guardado", description: "Cambios registrados en el historial." });
    closeEdit();
  };

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
  const totalEdits = Object.keys(overrides).length;

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
              {totalEdits > 0 && (
                <span className="ml-2 text-primary font-medium">· {totalEdits} editados</span>
              )}
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
              <LubricacionTable
                rows={filteredRows}
                tab={activeTab}
                overrides={overrides}
                history={history}
                onEdit={openEdit}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Editar componente
            </DialogTitle>
            <DialogDescription>
              {editing?.row.equipo} · {editing?.row.componente}
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Lubricante recomendado</Label>
                <Input
                  value={form.lubricante_recomendado ?? ""}
                  onChange={(e) => setForm({ ...form, lubricante_recomendado: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Input
                  value={form.tipo_recomendado ?? ""}
                  onChange={(e) => setForm({ ...form, tipo_recomendado: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input
                  value={form.volumen === null || form.volumen === undefined ? "" : String(form.volumen)}
                  onChange={(e) => setForm({ ...form, volumen: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input
                  value={form.unidad ?? ""}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  placeholder="L, kg, gr..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Input
                  value={form.frecuencia ?? ""}
                  onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                  placeholder="Ej: Mensual, 500 h"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vaso lubricador</Label>
                <Select
                  value={vasoUses(form.vaso_lubricador) ? "si" : form.vaso_lubricador ? "no" : ""}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      vaso_lubricador: v === "si" ? "Sí" : v === "no" ? "No" : null,
                      periodo: v === "si" ? form.periodo : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {vasoUses(form.vaso_lubricador) && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Periodo (tiempo de frecuencia del vaso)</Label>
                  <Input
                    value={form.periodo ?? ""}
                    onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                    placeholder="Ej: 7 días, 1 mes"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
