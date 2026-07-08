import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/pdfReport";
import { useSaveReport, ReportRow, ReportTipo } from "@/hooks/useReports";
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
const STATUSES = ["Satisfactorio", "Seguimiento", "Alerta", "Crítico", "Sin medición"];

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
  const [week, setWeek] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [tecnico, setTecnico] = useState("");
  const [hallazgos, setHallazgos] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [status, setStatus] = useState("Satisfactorio");
  const [newPhotos, setNewPhotos] = useState<{ blob: Blob; preview: string; caption: string }[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string; caption: string | null }[]>([]);
  const [equipSearch, setEquipSearch] = useState("");

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

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEquipmentId(editing.equipment_id);
      setTipo(editing.tipo);
      setWeek(editing.week_number);
      setYear(editing.year);
      setFecha(editing.fecha_inspeccion);
      setTecnico(editing.tecnico || "");
      setHallazgos(editing.hallazgos || "");
      setRecomendacion(editing.recomendacion || "");
      setStatus(editing.status_resultante);
      setExistingPhotos(
        (editing.photos || []).map((p) => ({ id: p.id, url: p.signedUrl || "", caption: p.caption }))
      );
    } else {
      setEquipmentId(defaultEquipmentId || "");
      setTipo("Vibraciones");
      setWeek(defaultWeek || 1);
      setYear(defaultYear || new Date().getFullYear());
      setFecha(new Date().toISOString().slice(0, 10));
      setTecnico("");
      setHallazgos("");
      setRecomendacion("");
      setStatus(defaultStatus || "Satisfactorio");
      setExistingPhotos([]);
    }
    setNewPhotos([]);
    setRemoveIds([]);
    setEquipSearch("");
  }, [open, editing, defaultEquipmentId, defaultWeek, defaultYear, defaultStatus]);

  const filteredEquipment = useMemo(() => {
    const t = equipSearch.trim().toLowerCase();
    if (!t) return equipmentList?.slice(0, 200) || [];
    return (
      equipmentList
        ?.filter((e: any) => e.tag.toLowerCase().includes(t) || e.name.toLowerCase().includes(t))
        .slice(0, 200) || []
    );
  }, [equipmentList, equipSearch]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr: typeof newPhotos = [];
    for (const f of Array.from(files)) {
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
      toast.error("Selecciona un equipo");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        equipment_id: equipmentId,
        tipo,
        week_number: week,
        year,
        fecha_inspeccion: fecha,
        tecnico,
        hallazgos,
        recomendacion,
        status_resultante: status,
        newPhotos: newPhotos.map((p) => ({ blob: p.blob, caption: p.caption })),
        removePhotoIds: removeIds,
      });
      toast.success(editing ? "Informe actualizado" : "Informe creado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar informe" : "Nuevo informe"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Equipo</Label>
              <Input
                placeholder="Buscar Tag o Nombre..."
                value={equipSearch}
                onChange={(e) => setEquipSearch(e.target.value)}
              />
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
              <Label>Tipo de informe</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ReportTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Semana</Label>
              <Input type="number" min={1} max={53} value={week} onChange={(e) => setWeek(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Año</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Fecha inspección</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Técnico</Label>
              <Input value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Estado resultante</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Hallazgos</Label>
            <Textarea rows={3} value={hallazgos} onChange={(e) => setHallazgos(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Recomendación</Label>
            <Textarea rows={3} value={recomendacion} onChange={(e) => setRecomendacion(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Fotografías</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Las imágenes se comprimen automáticamente para mantener el PDF ≤ 1 MB.
            </p>

            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {existingPhotos.map((p) => (
                  <div key={p.id} className="relative border rounded overflow-hidden">
                    {p.url && <img src={p.url} alt="" className="w-full h-32 object-cover" />}
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
                    <img src={p.preview} alt="" className="w-full h-32 object-cover" />
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
