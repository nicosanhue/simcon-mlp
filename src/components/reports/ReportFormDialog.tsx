import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Upload, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, CONDICIONES, worstCondition, conditionRgb, GERENCIA_FIJA } from "@/lib/pdfReport";
import { useSaveReport, ReportRow, ReportTipo, ReportItem, COMPONENTES } from "@/hooks/useReports";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: ReportRow | null;
  defaultEquipmentId?: string;
  defaultWeek?: number;
  defaultYear?: number;
  defaultStatus?: string;
}

const TIPOS: ReportTipo[] = ["Vibraciones", "Termografia", "Ultrasonido"];
const MAX_PHOTOS = 4;

function emptyItem(tag: string, orden: number): ReportItem {
  return {
    equipo_tag: tag,
    componente: "Motor",
    analisis_tecnico: "",
    diagnostico: "",
    recomendacion: "",
    condicion: "Satisfactorio",
    aviso_sap: "",
    orden,
  };
}

export function ReportFormDialog({
  open,
  onOpenChange,
  editing,
  defaultEquipmentId,
  defaultWeek,
  defaultYear,
  defaultStatus,
}: Props) {
  const save = useSaveReport();

  const [equipmentId, setEquipmentId] = useState<string>("");
  const [tipo, setTipo] = useState<ReportTipo>("Vibraciones");
  const [fechaInforme, setFechaInforme] = useState<string>(new Date().toISOString().slice(0, 10));

  const [procesoArea, setProcesoArea] = useState("");
  const [avisoSap, setAvisoSap] = useState("");
  const [otNumero, setOtNumero] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ blob: Blob; preview: string; caption: string }[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string; caption: string | null }[]>([]);
  const [equipSearch, setEquipSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");

  const { data: equipmentList } = useQuery({
    queryKey: ["equipment-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, tag, name, systems(name, areas(name))")
        .order("tag")
        .limit(2000);
      if (error) throw error;
      return data || [];
    },
  });

  const areas = useMemo(() => {
    const s = new Set<string>();
    (equipmentList || []).forEach((e: any) => {
      const a = e.systems?.areas?.name;
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [equipmentList]);

  const selectedEquipment = useMemo(
    () => (equipmentList || []).find((e: any) => e.id === equipmentId) as any,
    [equipmentList, equipmentId]
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEquipmentId(editing.equipment_id);
      setTipo(editing.tipo);
      setFechaInforme(editing.fecha_informe || editing.fecha_inspeccion);

      setProcesoArea(editing.proceso_area || "");
      setAvisoSap(editing.aviso_sap || "");
      setOtNumero(editing.ot_numero || "");
      setTecnico(editing.tecnico || "");
      setItems(
        (editing.items || []).slice().sort((a, b) => a.orden - b.orden).map((i) => ({ ...i }))
      );
      setExistingPhotos(
        (editing.photos || []).map((p) => ({ id: p.id, url: p.signedUrl || "", caption: p.caption }))
      );
    } else {
      setEquipmentId(defaultEquipmentId || "");
      setTipo("Vibraciones");
      setFechaInforme(new Date().toISOString().slice(0, 10));

      setProcesoArea("");
      setAvisoSap("");
      setOtNumero("");
      setTecnico("");
      setItems([emptyItem("", 0)]);
      setExistingPhotos([]);
    }
    setNewPhotos([]);
    setRemoveIds([]);
    setEquipSearch("");
    setAreaFilter("all");
  }, [open, editing, defaultEquipmentId, defaultWeek, defaultYear, defaultStatus]);

  // autocompletar proceso/área y tag de las filas al elegir equipo
  useEffect(() => {
    if (!selectedEquipment) return;
    const area = selectedEquipment.systems?.areas?.name || "";
    const sys = selectedEquipment.systems?.name || "";
    setProcesoArea((prev) => prev || `${area} / ${sys}`);
    setItems((prev) =>
      prev.map((i) => (i.equipo_tag ? i : { ...i, equipo_tag: selectedEquipment.tag }))
    );
  }, [selectedEquipment]);

  const filteredEquipment = useMemo(() => {
    const t = equipSearch.trim().toLowerCase();
    return (
      (equipmentList || [])
        .filter((e: any) => areaFilter === "all" || e.systems?.areas?.name === areaFilter)
        .filter(
          (e: any) => !t || e.tag.toLowerCase().includes(t) || e.name.toLowerCase().includes(t)
        )
        .slice(0, 200) || []
    );
  }, [equipmentList, equipSearch, areaFilter]);

  const condicionGeneral = useMemo(
    () => worstCondition(items.map((i) => i.condicion)),
    [items]
  );
  const [cr, cg, cb] = conditionRgb(condicionGeneral);

  function updateItem(idx: number, patch: Partial<ReportItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - (existingPhotos.length + newPhotos.length);
    if (room <= 0) {
      toast.error(`Máximo ${MAX_PHOTOS} fotografías`);
      return;
    }
    const arr: typeof newPhotos = [];
    for (const f of Array.from(files).slice(0, room)) {
      try {
        const { blob, dataUrl } = await compressImage(f, 1280, 0.7);
        arr.push({ blob, preview: dataUrl, caption: "" });
      } catch (e) {
        console.error(e);
      }
    }
    setNewPhotos((prev) => [...prev, ...arr]);
  }

  async function handleSave() {
    if (!equipmentId) {
      toast.error("Selecciona un equipo en Título / ID");
      return;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un componente");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        equipment_id: equipmentId,
        tipo,
        fecha_inspeccion: fechaInforme,
        fecha_informe: fechaInforme,
        gerencia: GERENCIA_FIJA,

        proceso_area: procesoArea,
        ot_numero: otNumero,
        aviso_sap: avisoSap,
        condicion_general: condicionGeneral,
        tecnico,
        hallazgos: items.map((i) => `${i.componente}: ${i.analisis_tecnico || ""}`).join(" | "),
        recomendacion: items.map((i) => i.recomendacion).filter(Boolean).join(" | "),
        status_resultante: condicionGeneral,
        items,
        newPhotos: newPhotos.map((p) => ({ blob: p.blob, caption: p.caption })),
        removePhotoIds: removeIds,
      });
      toast.success(editing ? "Informe actualizado" : "Informe creado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
  }

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar informe" : "Nuevo informe"} — Equipo / Componentes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cabecera del informe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:row-span-2">
              <Label>Título / ID (equipo)</Label>
              <div className="flex gap-2">
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Área" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar Tag o Nombre..."
                  value={equipSearch}
                  onChange={(e) => setEquipSearch(e.target.value)}
                />
              </div>
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona equipo" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredEquipment.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.tag} — {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fecha informe</Label>
              <Input type="date" value={fechaInforme} onChange={(e) => setFechaInforme(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>N° Aviso SAP</Label>
              <Input value={avisoSap} onChange={(e) => setAvisoSap(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>OT N°</Label>
              <Input value={otNumero} onChange={(e) => setOtNumero(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Proceso / Área</Label>
              <Input value={procesoArea} onChange={(e) => setProcesoArea(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tipo de informe</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ReportTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Gerencia</Label>
              <Input value={GERENCIA_FIJA} readOnly disabled />
            </div>

            <div className="space-y-1">
              <Label>Técnico</Label>
              <Input value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
            </div>
          </div>

          {/* 1. Resumen */}
          <div>
            <p className="text-sm font-semibold mb-2">1. Resumen de condición del equipo</p>
            <div
              className="rounded-md p-3 text-center text-white"
              style={{ backgroundColor: `rgb(${cr},${cg},${cb})` }}
            >
              <p className="text-lg font-bold uppercase">{condicionGeneral}</p>
              <p className="text-xs opacity-90">Condición más desfavorable de la evaluación detallada</p>
            </div>
          </div>

          {/* 2. Evaluación detallada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">2. Evaluación detallada por equipo y componente</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems((arr) => [...arr, emptyItem(selectedEquipment?.tag || "", arr.length)])
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Agregar componente
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2 bg-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Equipo / Tag</Label>
                      <Input
                        value={it.equipo_tag || ""}
                        onChange={(e) => updateItem(idx, { equipo_tag: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Componente</Label>
                      <Select value={it.componente} onValueChange={(v) => updateItem(idx, { componente: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COMPONENTES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Condición</Label>
                      <Select value={it.condicion} onValueChange={(v) => updateItem(idx, { condicion: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDICIONES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Aviso SAP</Label>
                      <div className="flex gap-1">
                        <Input
                          value={it.aviso_sap || ""}
                          onChange={(e) => updateItem(idx, { aviso_sap: e.target.value })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Análisis técnico</Label>
                      <Textarea rows={3} value={it.analisis_tecnico || ""}
                        onChange={(e) => updateItem(idx, { analisis_tecnico: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Diagnóstico</Label>
                      <Textarea rows={3} value={it.diagnostico || ""}
                        onChange={(e) => updateItem(idx, { diagnostico: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Recomendación</Label>
                      <Textarea rows={3} value={it.recomendacion || ""}
                        onChange={(e) => updateItem(idx, { recomendacion: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotografías (opcional, máx. {MAX_PHOTOS})</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                disabled={totalPhotos >= MAX_PHOTOS}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPhotos}/{MAX_PHOTOS} — se ajustan al ancho de la página manteniendo el informe en una hoja carta.
            </p>

            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {existingPhotos.map((p) => (
                  <div key={p.id} className="relative border rounded overflow-hidden">
                    {p.url && <img src={p.url} alt="" className="w-full h-28 object-cover" />}
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1"
                      onClick={() => {
                        setRemoveIds((r) => [...r, p.id]);
                        setExistingPhotos((arr) => arr.filter((x) => x.id !== p.id));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {p.caption && <div className="p-1 text-xs bg-muted truncate">{p.caption}</div>}
                  </div>
                ))}
                {newPhotos.map((p, i) => (
                  <div key={i} className="relative border rounded overflow-hidden">
                    <img src={p.preview} alt="" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1"
                      onClick={() => setNewPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Input
                      placeholder="Descripción..."
                      className="rounded-none border-0 text-xs h-7"
                      value={p.caption}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewPhotos((arr) => arr.map((x, idx) => (idx === i ? { ...x, caption: v } : x)));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
