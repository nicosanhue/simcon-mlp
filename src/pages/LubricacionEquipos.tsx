import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Droplet, FileSpreadsheet, FileText, ImageIcon, Pencil, Search } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { LubEquipmentDialog } from "@/components/lubricacion/LubEquipmentDialog";
import { LubPhotoViewer } from "@/components/lubricacion/LubPhotoViewer";
import { LubDocsDialog } from "@/components/lubricacion/LubDocsDialog";
import {
  LubEquipmentRow,
  useLubEquipment,
  useLubManuals,
  useLubOptions,
  useLubPhotoCounts,
} from "@/hooks/useLubricacion";
import { toast } from "sonner";

const ALL = "all";

const AREA_ORDER = ["Transporte de Fluidos", "Tranque Mauro", "Puerto", "Desaladora"];

function areaRank(name: string) {
  const idx = AREA_ORDER.indexOf(name);
  return idx === -1 ? AREA_ORDER.length : idx;
}

function sortAreas(a: string, b: string) {
  return areaRank(a) - areaRank(b) || a.localeCompare(b);
}

export default function LubricacionEquipos() {
  const { isEditor } = useProfile();

  const { data: rows, isLoading } = useLubEquipment();
  const { data: options } = useLubOptions();
  const { data: photoCounts } = useLubPhotoCounts();
  const { data: manuals } = useLubManuals();

  const [search, setSearch] = useState("");
  const [area, setArea] = useState(ALL);
  const [system, setSystem] = useState(ALL);
  const [tipo, setTipo] = useState(ALL);
  const [editing, setEditing] = useState<LubEquipmentRow | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<LubEquipmentRow | null>(null);
  const [viewingDocs, setViewingDocs] = useState<LubEquipmentRow | null>(null);

  const docCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of manuals || []) map[m.system_id] = (map[m.system_id] || 0) + 1;
    return map;
  }, [manuals]);

  const all = rows || [];

  const areas = useMemo(
    () => Array.from(new Set(all.map((r) => r.areaName))).sort(sortAreas),
    [all]
  );
  const systems = useMemo(
    () =>
      Array.from(
        new Set(all.filter((r) => area === ALL || r.areaName === area).map((r) => r.systemName))
      ).sort(),
    [all, area]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => {
      if (area !== ALL && r.areaName !== area) return false;
      if (system !== ALL && r.systemName !== system) return false;
      if (tipo !== ALL && (r.data?.tipo || "") !== tipo) return false;
      if (!term) return true;
      return (
        r.tag.toLowerCase().includes(term) ||
        r.name.toLowerCase().includes(term) ||
        (r.data?.descripcion || "").toLowerCase().includes(term) ||
        (r.data?.sap_number || "").toLowerCase().includes(term)
      );
    });
  }, [all, area, system, tipo, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, LubEquipmentRow[]>>();
    for (const r of filtered) {
      if (!map.has(r.areaName)) map.set(r.areaName, new Map());
      const sys = map.get(r.areaName)!;
      if (!sys.has(r.systemName)) sys.set(r.systemName, []);
      sys.get(r.systemName)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => sortAreas(a[0], b[0]))
      .map(([areaName, sysMap]) => ({
        areaName,
        systems: Array.from(sysMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([systemName, items]) => ({ systemName, items })),
      }));
  }, [filtered]);

  const completos = filtered.filter((r) => !!r.data).length;

  function exportExcel() {
    const data = filtered.map((r) => ({
      Área: r.areaName,
      Sistema: r.systemName,
      "N° Equipo SAP": r.data?.sap_number || "",
      Tipo: r.data?.tipo || "",
      "Tag Equipo": r.tag,
      Descripción: r.data?.descripcion || r.name,
      Motor: r.data?.has_motor ? "x" : "",
      Portarodamiento: r.data?.has_portarodamiento ? "x" : "",
      Reductor: r.data?.has_reductor ? "x" : "",
      Descanso: r.data?.has_descanso ? "x" : "",
      "Acoplam Alta. Tipo": r.data?.acop_alta_tipo || "",
      "Acoplam. Grasa": r.data?.acop_alta_grasa || "",
      "Acoplam. Cantidad (g)": r.data?.acop_alta_cantidad ?? "",
      "Acoplam. Aceite": r.data?.acop_alta_aceite || "",
      "Acoplam. Frecuencia": r.data?.acop_alta_frecuencia || "",
      "Acoplam Baja. Tipo": r.data?.acop_baja_tipo || "",
      "Acoplam. Grasa Baja": r.data?.acop_baja_grasa || "",
      "Acoplam. Cantidad Baja (g)": r.data?.acop_baja_cantidad ?? "",
      "Acoplam. Aceite Baja": r.data?.acop_baja_aceite || "",
      "Acoplam. Frecuencia Baja": r.data?.acop_baja_frecuencia || "",
      "Motor - Tipo Lub": r.data?.motor_tipo_lub || "",
      "Motor - Descanso LL": r.data?.motor_desc_ll || "",
      "Mot - Cant. Desc LL (g)": r.data?.motor_desc_ll_cant ?? "",
      "Motor - Descanso LA": r.data?.motor_desc_la || "",
      "Mot - Cant. Desc LA (g)": r.data?.motor_desc_la_cant ?? "",
      "Motor - Sello LL": r.data?.motor_sello_ll || "",
      "Mot - Cant. Sello LL (g)": r.data?.motor_sello_ll_cant ?? "",
      "Motor - Sello LA": r.data?.motor_sello_la || "",
      "Mot - Cant. Sello LA (g)": r.data?.motor_sello_la_cant ?? "",
      "Motor - Frec. Descansos": r.data?.motor_desc_frecuencia || "",
      "Motor - Frec. Sellos": r.data?.motor_sello_frecuencia || "",
      "Reductor - Aceite": r.data?.reductor_aceite || "",
      "Reductor - Capacidad (L)": r.data?.reductor_capacidad ?? "",
      "Reductor - Frec. Aceite": r.data?.reductor_aceite_frecuencia || "",
      "Reductor - Sello LL": r.data?.reductor_sello_ll || "",
      "Red - Cant. Sello LL (g)": r.data?.reductor_sello_ll_cant ?? "",
      "Reductor - Sello LA": r.data?.reductor_sello_la || "",
      "Red - Cant. Sello LA (g)": r.data?.reductor_sello_la_cant ?? "",
      "Reductor - Frecuencia": r.data?.reductor_frecuencia || "",
      "Porta - Tipo Lub": r.data?.porta_tipo_lub || "",
      "Porta - Descanso LL": r.data?.porta_desc_ll || "",
      "Por - Cant. Desc LL (g)": r.data?.porta_desc_ll_cant ?? "",
      "Porta - Descanso LA": r.data?.porta_desc_la || "",
      "Por - Cant. Desc LA (g)": r.data?.porta_desc_la_cant ?? "",
      "Porta - Sello LL": r.data?.porta_sello_ll || "",
      "Por - Cant. Sello LL (g)": r.data?.porta_sello_ll_cant ?? "",
      "Porta - Sello LA": r.data?.porta_sello_la || "",
      "Por - Cant. Sello LA (g)": r.data?.porta_sello_la_cant ?? "",
      "Porta - Frec. Descansos": r.data?.porta_desc_frecuencia || "",
      "Porta - Frec. Sellos": r.data?.porta_sello_frecuencia || "",
      "Descanso - Condición": r.data?.descanso_condicion || "",
      "Descanso - Grasa": r.data?.descanso_grasa || "",
      "Descanso - Cantidad (g)": r.data?.descanso_cantidad ?? "",
      "Descanso - Frecuencia": r.data?.descanso_frecuencia || "",
      "Descanso - Sello LL": r.data?.descanso_sello_ll || "",
      "Desc - Cant. Sello LL (g)": r.data?.descanso_sello_ll_cant ?? "",
      "Descanso - Frec. Sello": r.data?.descanso_sello_frecuencia || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Plan Lubricación");
    XLSX.writeFile(wb, "Plan_Lubricacion.xlsx");
    toast.success("Excel generado");
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Droplet className="h-6 w-6 text-primary" />
              Lubricación Equipos
            </h1>
            <p className="text-sm text-muted-foreground">
              Repositorio maestro de lubricación por equipo, con fotografías y documentos por sistema.
            </p>
          </div>
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </header>

        <Card>
          <CardContent className="pt-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Tag, descripción o N° SAP..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={area} onValueChange={(v) => { setArea(v); setSystem(ALL); }}>
              <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las áreas</SelectItem>
                {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={system} onValueChange={setSystem}>
              <SelectTrigger><SelectValue placeholder="Sistema" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los sistemas</SelectItem>
                {systems.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {(options?.tipo_equipo || []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="md:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{filtered.length} equipos</Badge>
              <Badge variant="outline">{completos} con datos de lubricación</Badge>
              {!isEditor && <span className="text-xs">Modo lectura — ingresa a un perfil para editar.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plan de lubricación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando equipos...</p>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin resultados.</p>
            ) : (
              grouped.map((a) => (
                <Collapsible key={a.areaName} defaultOpen={false}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm font-semibold">
                    <span>{a.areaName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {a.systems.reduce((n, s) => n + s.items.length, 0)}
                      </Badge>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {a.systems.map((s) => (
                      <Collapsible key={s.systemName} defaultOpen={false}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                          <span>{s.systemName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{s.items.length}</Badge>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tag</TableHead>
                                <TableHead>N° SAP</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Componentes</TableHead>
                                <TableHead>Aceite reductor</TableHead>
                                <TableHead>Grasa motor</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.items.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-medium text-xs">{r.tag}</TableCell>
                                  <TableCell className="text-xs">{r.data?.sap_number || "—"}</TableCell>
                                  <TableCell className="text-xs">{r.data?.tipo || "—"}</TableCell>
                                  <TableCell className="text-xs">{r.data?.descripcion || r.name}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex flex-wrap gap-1">
                                      {r.data?.has_motor && <Badge variant="secondary" className="text-[10px]">Motor</Badge>}
                                      {r.data?.has_reductor && <Badge variant="secondary" className="text-[10px]">Reductor</Badge>}
                                      {r.data?.has_portarodamiento && <Badge variant="secondary" className="text-[10px]">Porta</Badge>}
                                      {r.data?.has_descanso && <Badge variant="secondary" className="text-[10px]">Descanso</Badge>}
                                      {!r.data && <span className="text-muted-foreground">Sin datos</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs">{r.data?.reductor_aceite || "—"}</TableCell>
                                  <TableCell className="text-xs">{r.data?.motor_tipo_lub || "—"}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 relative"
                                        title="Ver fotografías"
                                        aria-label="Ver fotografías"
                                        onClick={() => setViewingPhotos(r)}
                                      >
                                        <ImageIcon
                                          className={`h-3.5 w-3.5 ${photoCounts?.[r.id] ? "text-primary" : "text-muted-foreground"}`}
                                        />
                                        {!!photoCounts?.[r.id] && (
                                          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-semibold text-primary">
                                            {photoCounts[r.id]}
                                          </span>
                                        )}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 relative"
                                        title="Documentos del sistema"
                                        aria-label="Documentos del sistema"
                                        onClick={() => setViewingDocs(r)}
                                      >
                                        <FileText
                                          className={`h-3.5 w-3.5 ${docCounts[r.system_id] ? "text-primary" : "text-muted-foreground"}`}
                                        />
                                        {!!docCounts[r.system_id] && (
                                          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-semibold text-primary">
                                            {docCounts[r.system_id]}
                                          </span>
                                        )}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={!isEditor}
                                        title="Editar"
                                        aria-label="Editar"
                                        onClick={() => setEditing(r)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </CardContent>
        </Card>

        <LubPhotoViewer
          equipmentId={viewingPhotos?.id}
          title={viewingPhotos ? `${viewingPhotos.tag} — ${viewingPhotos.name}` : undefined}
          open={!!viewingPhotos}
          onOpenChange={(v) => !v && setViewingPhotos(null)}
        />

        <LubDocsDialog
          systemId={viewingDocs?.system_id}
          systemName={viewingDocs?.systemName}
          canEdit={isEditor}
          open={!!viewingDocs}
          onOpenChange={(v) => !v && setViewingDocs(null)}
        />

        <LubEquipmentDialog
          row={editing}
          options={options || {}}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      </div>
    </MainLayout>
  );
}
