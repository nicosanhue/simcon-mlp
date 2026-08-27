import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  LubData,
  LubEquipmentRow,
  LubManual,
  downloadManual,
  emptyLubData,
  useDeleteLubPhoto,
  useDeleteManual,
  useLubManuals,
  useLubPhotos,
  useSaveLubData,
  useUploadLubPhotos,
  useUploadManual,
} from "@/hooks/useLubricacion";

const NONE = "__none__";

interface Props {
  row: LubEquipmentRow | null;
  options: Record<string, string[]>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/** Determina qué lubricación aplica según el tipo de acoplamiento */
function acopMode(tipo: string | null): "grasa" | "aceite" | "none" | "unset" {
  if (!tipo) return "unset";
  const t = tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (t.includes("grilla") || t.includes("machon")) return "grasa";
  if (t.includes("hidraul")) return "aceite";
  if (t.includes("rigid") || t.includes("omega")) return "none";
  return "grasa";
}

function lubList(tipoLub: string | null) {
  return (tipoLub || "").toLowerCase().startsWith("acei") ? "aceite" : "grasa";
}

export function LubEquipmentDialog({ row, options, open, onOpenChange }: Props) {
  const [form, setForm] = useState<LubData | null>(null);
  const save = useSaveLubData();
  const photos = useLubPhotos(row?.id);
  const upload = useUploadLubPhotos();
  const delPhoto = useDeleteLubPhoto();
  const manuals = useLubManuals();
  const uploadDoc = useUploadManual();
  const delDoc = useDeleteManual();
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (row) setForm(row.data ? { ...emptyLubData(row.id), ...row.data } : emptyLubData(row.id));
  }, [row]);

  if (!row || !form) return null;

  const docs = (manuals.data || []).filter((m) => m.system_id === row.system_id);

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

  const selFixed = (label: string, k: keyof LubData, values: string[]) => (
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
          {values.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const section = (title: string, children: React.ReactNode, subtitle?: string) => (
    <div className="space-y-2" key={title}>
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
      <Separator />
    </div>
  );

  const grid = (children: React.ReactNode) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
  );

  const subBlock = (title: string, children: React.ReactNode) => (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      {grid(children)}
    </div>
  );

  /** Bloque de acoplamiento con campos condicionales */
  const acoplamiento = (
    label: string,
    kTipo: keyof LubData,
    kGrasa: keyof LubData,
    kAceite: keyof LubData,
    kCant: keyof LubData,
    kFrec: keyof LubData
  ) => {
    const mode = acopMode(form![kTipo] as string | null);
    return section(
      label,
      <div className="space-y-2">
        {grid(
          <>
            {sel("Tipo de acoplamiento", kTipo, "acoplamiento")}
            {mode === "grasa" && (
              <>
                {sel("Tipo de grasa", kGrasa, "grasa")}
                {num("Cantidad (g)", kCant)}
                {sel("Frecuencia", kFrec, "frecuencia")}
              </>
            )}
            {mode === "aceite" && (
              <>
                {sel("Tipo de aceite", kAceite, "aceite")}
                {num("Cantidad (L)", kCant)}
                {sel("Frecuencia", kFrec, "frecuencia")}
              </>
            )}
          </>
        )}
        {mode === "none" && (
          <p className="text-xs italic text-muted-foreground">No aplica lubricación.</p>
        )}
      </div>
    );
  };

  async function handleSave() {
    try {
      await save.mutateAsync(form!);
      toast.success("Datos de lubricación guardados");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
  }

  async function handleDocs(files: File[]) {
    if (!files.length) return;
    try {
      for (const f of files) await uploadDoc.mutateAsync({ systemId: row!.system_id, file: f });
      toast.success("Documentos subidos (disponibles para todo el sistema)");
    } catch (e: any) {
      toast.error("Error al subir documento: " + e.message);
    }
  }

  async function handleDownloadDoc(m: LubManual) {
    try {
      await downloadManual(m);
    } catch (e: any) {
      toast.error("Error al descargar: " + e.message);
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
          {section(
            "1. Identificación",
            grid(
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
            )
          )}

          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-primary">2. Componentes presentes</p>
              <p className="text-[11px] text-muted-foreground">
                Marca los componentes: solo se mostrarán los campos que apliquen.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {([
                ["has_motor", "Motor"],
                ["has_portarodamiento", "Portarodamiento"],
                ["has_reductor", "Reductor"],
                ["has_descanso", "Descanso"],
              ] as [keyof LubData, string][]).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!form[k]} onCheckedChange={(v) => set(k, !!v)} />
                  {label}
                </label>
              ))}
            </div>
            <Separator />
          </div>

          {acoplamiento(
            "3. Acoplamiento Alta",
            "acop_alta_tipo",
            "acop_alta_grasa",
            "acop_alta_aceite",
            "acop_alta_cantidad",
            "acop_alta_frecuencia"
          )}

          {acoplamiento(
            "4. Acoplamiento Baja",
            "acop_baja_tipo",
            "acop_baja_grasa",
            "acop_baja_aceite",
            "acop_baja_cantidad",
            "acop_baja_frecuencia"
          )}

          {form.has_motor &&
            section(
              "5. Motor",
              <div className="space-y-3">
                {grid(selFixed("Tipo de lubricante descansos", "motor_tipo_lub", ["Grasa", "Aceite"]))}
                {subBlock(
                  "Descansos",
                  <>
                    {sel(
                      lubList(form.motor_tipo_lub) === "aceite" ? "Aceite Descanso LL" : "Grasa Descanso LL",
                      "motor_desc_ll",
                      lubList(form.motor_tipo_lub)
                    )}
                    {num(
                      lubList(form.motor_tipo_lub) === "aceite" ? "Cant. Desc LL (L)" : "Cant. Desc LL (g)",
                      "motor_desc_ll_cant"
                    )}
                    {sel(
                      lubList(form.motor_tipo_lub) === "aceite" ? "Aceite Descanso LA" : "Grasa Descanso LA",
                      "motor_desc_la",
                      lubList(form.motor_tipo_lub)
                    )}
                    {num(
                      lubList(form.motor_tipo_lub) === "aceite" ? "Cant. Desc LA (L)" : "Cant. Desc LA (g)",
                      "motor_desc_la_cant"
                    )}
                    {sel("Frecuencia descansos", "motor_desc_frecuencia", "frecuencia")}
                  </>
                )}
                {subBlock(
                  "Sellos (solo grasa)",
                  <>
                    {sel("Grasa Sello LL", "motor_sello_ll", "grasa")}
                    {num("Cant. Sello LL (g)", "motor_sello_ll_cant")}
                    {sel("Grasa Sello LA", "motor_sello_la", "grasa")}
                    {num("Cant. Sello LA (g)", "motor_sello_la_cant")}
                    {sel("Frecuencia sellos", "motor_sello_frecuencia", "frecuencia")}
                  </>
                )}
              </div>
            )}

          {form.has_reductor &&
            section(
              "6. Reductor",
              <div className="space-y-3">
                {subBlock(
                  "Aceite",
                  <>
                    {sel("Tipo de aceite", "reductor_aceite", "aceite")}
                    {num("Capacidad (L)", "reductor_capacidad")}
                    {sel("Frecuencia cambio de aceite", "reductor_aceite_frecuencia", "frecuencia")}
                  </>
                )}
                {subBlock(
                  "Sellos (solo grasa)",
                  <>
                    {sel("Grasa Sello LL", "reductor_sello_ll", "grasa")}
                    {num("Cant. Sello LL (g)", "reductor_sello_ll_cant")}
                    {sel("Grasa Sello LA", "reductor_sello_la", "grasa")}
                    {num("Cant. Sello LA (g)", "reductor_sello_la_cant")}
                    {sel("Frecuencia sellos", "reductor_frecuencia", "frecuencia")}
                  </>
                )}
              </div>
            )}

          {form.has_portarodamiento &&
            section(
              "7. Portarodamiento",
              <div className="space-y-3">
                {grid(selFixed("Tipo de lubricante descansos", "porta_tipo_lub", ["Grasa", "Aceite"]))}
                {subBlock(
                  "Descansos",
                  <>
                    {sel(
                      lubList(form.porta_tipo_lub) === "aceite" ? "Aceite Descanso LL" : "Grasa Descanso LL",
                      "porta_desc_ll",
                      lubList(form.porta_tipo_lub)
                    )}
                    {num(
                      lubList(form.porta_tipo_lub) === "aceite" ? "Cant. Desc LL (L)" : "Cant. Desc LL (g)",
                      "porta_desc_ll_cant"
                    )}
                    {sel(
                      lubList(form.porta_tipo_lub) === "aceite" ? "Aceite Descanso LA" : "Grasa Descanso LA",
                      "porta_desc_la",
                      lubList(form.porta_tipo_lub)
                    )}
                    {num(
                      lubList(form.porta_tipo_lub) === "aceite" ? "Cant. Desc LA (L)" : "Cant. Desc LA (g)",
                      "porta_desc_la_cant"
                    )}
                    {sel("Frecuencia descansos", "porta_desc_frecuencia", "frecuencia")}
                  </>
                )}
                {subBlock(
                  "Sellos (solo grasa)",
                  <>
                    {sel("Grasa Sello LL", "porta_sello_ll", "grasa")}
                    {num("Cant. Sello LL (g)", "porta_sello_ll_cant")}
                    {sel("Grasa Sello LA", "porta_sello_la", "grasa")}
                    {num("Cant. Sello LA (g)", "porta_sello_la_cant")}
                    {sel("Frecuencia sellos", "porta_sello_frecuencia", "frecuencia")}
                  </>
                )}
              </div>
            )}

          {form.has_descanso &&
            section(
              "8. Descanso",
              <div className="space-y-3">
                {grid(selFixed("Tipo", "descanso_condicion", ["Lubricado", "Sellado"]))}
                {subBlock(
                  "Lubricación",
                  <>
                    {sel("Tipo de grasa", "descanso_grasa", "grasa")}
                    {num("Cantidad (g)", "descanso_cantidad")}
                    {sel("Frecuencia", "descanso_frecuencia", "frecuencia")}
                  </>
                )}
                {subBlock(
                  "Sello LL (solo grasa)",
                  <>
                    {sel("Grasa Sello LL", "descanso_sello_ll", "grasa")}
                    {num("Cant. Sello LL (g)", "descanso_sello_ll_cant")}
                    {sel("Frecuencia sello", "descanso_sello_frecuencia", "frecuencia")}
                  </>
                )}
              </div>
            )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">9. Fotografías</p>
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
            <Separator />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">10. Documentos</p>
                <p className="text-[11px] text-muted-foreground">
                  Quedan disponibles para todos los equipos de {row.systemName}.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => docRef.current?.click()}
                disabled={uploadDoc.isPending}
              >
                {uploadDoc.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                Subir documentos
              </Button>
              <input
                ref={docRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  handleDocs(files);
                }}
              />
            </div>
            {docs.length ? (
              <ul className="divide-y rounded-md border">
                {docs.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-1.5">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs truncate flex-1">{m.nombre}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDownloadDoc(m)}
                      aria-label="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => delDoc.mutate(m)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin documentos en este sistema.</p>
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
