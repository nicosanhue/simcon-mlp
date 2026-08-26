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

  const txt = (label: string, k: keyof LubData) => (
    <div className="space-y-1" key={String(k)}>
      <Label className="text-xs">{label}</Label>
      <Input
        value={(form![k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value || null)}
        className="h-8"
      />
    </div>
  );

  const num = (label: string, k: keyof LubData) => (
    <div className="space-y-1" key={String(k)}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={(form![k] as number) ?? ""}
        onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))}
        className="h-8"
      />
    </div>
  );

  const sel = (label: string, k: keyof LubData, cat: string) => (
    <div className="space-y-1" key={String(k)}>
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
          {(options[cat] || []).map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div className="space-y-2" key={title}>
      <p className="text-sm font-semibold text-primary">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
      <Separator />
    </div>
  );


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
          {section("Identificación", (
            <>
              {txt("N° Equipo SAP", "sap_number")}
              {sel("Tipo", "tipo", "tipo_equipo")}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={form.descripcion ?? ""}
                  onChange={(e) => set("descripcion", e.target.value || null)}
                  className="h-8"
                />
              </div>
            </>
          ))}

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

          {section("Acoplamiento Alta", (
            <>
              {sel("Tipo", "acop_alta_tipo", "acoplamiento")}
              {sel("Grasa", "acop_alta_grasa", "grasa")}
              {num("Cantidad (g)", "acop_alta_cantidad")}
              {sel("Frecuencia", "acop_alta_frecuencia", "frecuencia")}
            </>
          ))}

          {section("Acoplamiento Baja", (
            <>
              {sel("Tipo", "acop_baja_tipo", "acoplamiento")}
              {sel("Grasa", "acop_baja_grasa", "grasa")}
              {num("Cantidad (g)", "acop_baja_cantidad")}
              {sel("Frecuencia", "acop_baja_frecuencia", "frecuencia")}
            </>
          ))}

          {section("Motor", (
            <>
              {sel("Tipo lubricante", "motor_tipo_lub", "grasa")}
              {sel("Descanso LL", "motor_desc_ll", "grasa")}
              {num("Cant. Desc LL (g)", "motor_desc_ll_cant")}
              {sel("Descanso LA", "motor_desc_la", "grasa")}
              {num("Cant. Desc LA (g)", "motor_desc_la_cant")}
              {sel("Sello LL", "motor_sello_ll", "grasa")}
              {num("Cant. Sello LL (g)", "motor_sello_ll_cant")}
              {sel("Sello LA", "motor_sello_la", "grasa")}
              {num("Cant. Sello LA (g)", "motor_sello_la_cant")}
              {sel("Frecuencia", "motor_frecuencia", "frecuencia")}
            </>
          ))}

          {section("Reductor", (
            <>
              {sel("Aceite", "reductor_aceite", "aceite")}
              {num("Capacidad (L)", "reductor_capacidad")}
              {sel("Sello LL", "reductor_sello_ll", "grasa")}
              {num("Cant. Sello LL (g)", "reductor_sello_ll_cant")}
              {sel("Sello LA", "reductor_sello_la", "grasa")}
              {num("Cant. Sello LA (g)", "reductor_sello_la_cant")}
              {sel("Frecuencia", "reductor_frecuencia", "frecuencia")}
            </>
          ))}

          {section("Portarodamiento", (
            <>
              {sel("Tipo lubricante", "porta_tipo_lub", "grasa")}
              {sel("Descanso LL", "porta_desc_ll", "grasa")}
              {num("Cant. Desc LL (g)", "porta_desc_ll_cant")}
              {sel("Descanso LA", "porta_desc_la", "grasa")}
              {num("Cant. Desc LA (g)", "porta_desc_la_cant")}
              {sel("Sello LL", "porta_sello_ll", "grasa")}
              {num("Cant. Sello LL (g)", "porta_sello_ll_cant")}
              {sel("Sello LA", "porta_sello_la", "grasa")}
              {num("Cant. Sello LA (g)", "porta_sello_la_cant")}
              {sel("Frecuencia", "porta_frecuencia", "frecuencia")}
            </>
          ))}

          {section("Descanso", (
            <>
              {txt("Condición", "descanso_condicion")}
              {sel("Grasa", "descanso_grasa", "grasa")}
              {num("Cantidad (g)", "descanso_cantidad")}
              {sel("Frecuencia", "descanso_frecuencia", "frecuencia")}
            </>
          ))}


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
