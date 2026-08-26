import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Trash2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  LubData,
  LubEquipmentRow,
  emptyLubData,
  useSaveLubData,
  useLubPhotos,
  useUploadLubPhotos,
  useDeleteLubPhoto,
} from "@/hooks/useLubricacion";

const NONE = "__none__";

interface Props {
  row: LubEquipmentRow | null;
  options: Record<string, string[]>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LubEquipmentDialog({ row, options, open, onOpenChange }: Props) {
  const [form, setForm] = useState<LubData | null>(null);
  const save = useSaveLubData();
  const photos = useLubPhotos(row?.id);
  const upload = useUploadLubPhotos();
  const delPhoto = useDeleteLubPhoto();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (row) setForm(row.data ? { ...row.data } : emptyLubData(row.id));
  }, [row]);

  if (!row || !form) return null;

  const set = (k: keyof LubData, v: any) => setForm((f) => ({ ...(f as LubData), [k]: v }));

  function Txt({ label, k }: { label: string; k: keyof LubData }) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          value={(form![k] as string) ?? ""}
          onChange={(e) => set(k, e.target.value || null)}
          className="h-8"
        />
      </div>
    );
  }

  function Num({ label, k }: { label: string; k: keyof LubData }) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          value={(form![k] as number) ?? ""}
          onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))}
          className="h-8"
        />
      </div>
    );
  }

  function Sel({ label, k, cat }: { label: string; k: keyof LubData; cat: string }) {
    const list = options[cat] || [];
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Select
          value={(form![k] as string) ?? NONE}
          onValueChange={(v) => set(k, v === NONE ? null : v)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {list.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">{title}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
        <Separator />
      </div>
    );
  }

  async function handleSave() {
    try {
      await save.mutateAsync(form!);
      toast.success("Datos de lubricación guardados");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row.tag} — {row.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {row.areaName} / {row.systemName}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="Identificación">
            <Txt label="N° Equipo SAP" k="sap_number" />
            <Sel label="Tipo" k="tipo" cat="tipo_equipo" />
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input
                value={form.descripcion ?? ""}
                onChange={(e) => set("descripcion", e.target.value || null)}
                className="h-8"
              />
            </div>
          </Section>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Componentes presentes</p>
            <div className="flex flex-wrap gap-4">
              {([
                ["has_motor", "Motor"],
                ["has_portarodamiento", "Portarodamiento"],
                ["has_reductor", "Reductor"],
                ["has_descanso", "Descanso"],
              ] as [keyof LubData, string][]).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!form[k]}
                    onCheckedChange={(v) => set(k, !!v)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Separator />
          </div>

          <Section title="Acoplamiento Alta">
            <Sel label="Tipo" k="acop_alta_tipo" cat="acoplamiento" />
            <Sel label="Grasa" k="acop_alta_grasa" cat="grasa" />
            <Num label="Cantidad (g)" k="acop_alta_cantidad" />
            <Sel label="Frecuencia" k="acop_alta_frecuencia" cat="frecuencia" />
          </Section>

          <Section title="Acoplamiento Baja">
            <Sel label="Tipo" k="acop_baja_tipo" cat="acoplamiento" />
            <Sel label="Grasa" k="acop_baja_grasa" cat="grasa" />
            <Num label="Cantidad (g)" k="acop_baja_cantidad" />
            <Sel label="Frecuencia" k="acop_baja_frecuencia" cat="frecuencia" />
          </Section>

          <Section title="Motor">
            <Sel label="Tipo lubricante" k="motor_tipo_lub" cat="grasa" />
            <Sel label="Descanso LL" k="motor_desc_ll" cat="grasa" />
            <Num label="Cant. Desc LL (g)" k="motor_desc_ll_cant" />
            <Sel label="Descanso LA" k="motor_desc_la" cat="grasa" />
            <Num label="Cant. Desc LA (g)" k="motor_desc_la_cant" />
            <Sel label="Sello LL" k="motor_sello_ll" cat="grasa" />
            <Num label="Cant. Sello LL (g)" k="motor_sello_ll_cant" />
            <Sel label="Sello LA" k="motor_sello_la" cat="grasa" />
            <Num label="Cant. Sello LA (g)" k="motor_sello_la_cant" />
            <Sel label="Frecuencia" k="motor_frecuencia" cat="frecuencia" />
          </Section>

          <Section title="Reductor">
            <Sel label="Aceite" k="reductor_aceite" cat="aceite" />
            <Num label="Capacidad (L)" k="reductor_capacidad" />
            <Sel label="Sello LL" k="reductor_sello_ll" cat="grasa" />
            <Num label="Cant. Sello LL (g)" k="reductor_sello_ll_cant" />
            <Sel label="Sello LA" k="reductor_sello_la" cat="grasa" />
            <Num label="Cant. Sello LA (g)" k="reductor_sello_la_cant" />
            <Sel label="Frecuencia" k="reductor_frecuencia" cat="frecuencia" />
          </Section>

          <Section title="Portarodamiento">
            <Sel label="Tipo lubricante" k="porta_tipo_lub" cat="grasa" />
            <Sel label="Descanso LL" k="porta_desc_ll" cat="grasa" />
            <Num label="Cant. Desc LL (g)" k="porta_desc_ll_cant" />
            <Sel label="Descanso LA" k="porta_desc_la" cat="grasa" />
            <Num label="Cant. Desc LA (g)" k="porta_desc_la_cant" />
            <Sel label="Sello LL" k="porta_sello_ll" cat="grasa" />
            <Num label="Cant. Sello LL (g)" k="porta_sello_ll_cant" />
            <Sel label="Sello LA" k="porta_sello_la" cat="grasa" />
            <Num label="Cant. Sello LA (g)" k="porta_sello_la_cant" />
            <Sel label="Frecuencia" k="porta_frecuencia" cat="frecuencia" />
          </Section>

          <Section title="Descanso">
            <Txt label="Condición" k="descanso_condicion" />
            <Sel label="Grasa" k="descanso_grasa" cat="grasa" />
            <Num label="Cantidad (g)" k="descanso_cantidad" />
            <Sel label="Frecuencia" k="descanso_frecuencia" cat="frecuencia" />
          </Section>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">Fotografías</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3 mr-1" />
                )}
                Subir fotos
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (!files.length) return;
                  try {
                    await upload.mutateAsync({ equipmentId: row!.id, files });
                    toast.success("Fotografías subidas");
                  } catch (err: any) {
                    toast.error("Error al subir: " + err.message);
                  }
                }}
              />
            </div>
            {photos.data?.length ? (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photos.data.map((p) => (
                  <div key={p.id} className="relative group">
                    <img
                      src={p.url}
                      alt={p.caption || "Foto del equipo"}
                      loading="lazy"
                      className="h-24 w-full object-cover rounded-md border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => delPhoto.mutate(p)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin fotografías.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
