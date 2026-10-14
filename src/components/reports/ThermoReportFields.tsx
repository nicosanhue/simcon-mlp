import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Camera } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/pdfReport";
import {
  ThermoContext, ThermoSystem, THERMO_NORMA_EJECUCION, THERMO_NORMA_EVALUACION, MAX_STATION_PHOTOS,
  thermoDescripcion, computeListado,
} from "@/lib/thermoReport";

export interface ExistingStationPhoto { id: string; url: string; station_code: string; spool_tag: string }
export interface NewStationPhoto { blob: Blob; preview: string; station_code: string; spool_tag: string }

interface Props {
  system: ThermoSystem;
  ctx: ThermoContext | undefined;
  weekKey: string;
  setWeekKey: (v: string) => void;
  inspectores: string;
  setInspectores: (v: string) => void;
  resultado: string;
  setResultado: (v: string) => void;
  ordenes: Record<string, string>;
  setOrdenes: (fn: (o: Record<string, string>) => Record<string, string>) => void;
  existing: ExistingStationPhoto[];
  onRemoveExisting: (id: string) => void;
  newPhotos: NewStationPhoto[];
  setNewPhotos: (fn: (a: NewStationPhoto[]) => NewStationPhoto[]) => void;
}

export function ThermoReportFields(p: Props) {
  const [pendingTag, setPendingTag] = useState<Record<string, string>>({});
  const ctx = p.ctx;
  const [wy, ww] = p.weekKey.split("-").map(Number);

  const listado = useMemo(() => (ctx && ww ? computeListado(ctx, ww, wy) : []), [ctx, ww, wy]);

  if (!ctx) return <p className="text-sm text-muted-foreground">Cargando datos de {p.system.toUpperCase()}…</p>;

  async function addPhoto(stationCode: string, files: FileList | null) {
    const tag = pendingTag[stationCode];
    if (!files?.length) return;
    if (!tag) return toast.error("Primero elige el TAG del spool");
    const count =
      p.existing.filter((x) => x.station_code === stationCode).length +
      p.newPhotos.filter((x) => x.station_code === stationCode).length;
    if (count >= MAX_STATION_PHOTOS) return toast.error(`Máximo ${MAX_STATION_PHOTOS} fotos por estación`);
    const { blob, dataUrl } = await compressImage(files[0], 1280, 0.7);
    p.setNewPhotos((a) => [...a, { blob, preview: dataUrl, station_code: stationCode, spool_tag: tag }]);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold mb-2">1. Antecedentes generales</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Descripción elemento</Label>
            <Input value={thermoDescripcion(p.system)} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label>Semana de la inspección</Label>
            <Select value={p.weekKey} onValueChange={p.setWeekKey}>
              <SelectTrigger><SelectValue placeholder="Semana" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {ctx.weeks.map((w) => (
                  <SelectItem key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                    Semana {w.week}/{w.year}{w.published ? "" : " (borrador)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Alcance Inspección IR</Label>
            <Input value={ctx.stations.map((s) => s.name).join(", ")} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label>Norma (s) Ejecución</Label>
            <Input value={THERMO_NORMA_EJECUCION} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label>Norma (s) Evaluación</Label>
            <Input value={THERMO_NORMA_EVALUACION} readOnly disabled />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Nombre Inspector (es)</Label>
            <Input value={p.inspectores} onChange={(e) => p.setInspectores(e.target.value)} placeholder="Ej: Romina Peredo - Gonzalo Peña" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Antecedentes técnicos y equipos utilizados se incluyen en el PDF con la información estándar (FLIR 865, emisividad 0,95…).
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold">4. Resultado de la inspección</p>
        <Textarea rows={4} value={p.resultado} onChange={(e) => p.setResultado(e.target.value)} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Listado de equipos (Alerta / Peligro) — automático</p>
        {listado.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin spools en Alerta (≥ 2,5 °C) o Peligro (≥ 5 °C) en la semana elegida.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr><th className="p-2 text-left">TAG</th><th className="p-2 text-left">Estación</th><th className="p-2">ΔT</th><th className="p-2">Condición</th><th className="p-2 text-left">Orden</th></tr>
              </thead>
              <tbody>
                {listado.map((l) => (
                  <tr key={l.tag} className="border-t">
                    <td className="p-2 font-mono">{l.tag}</td>
                    <td className="p-2">{l.estacion}</td>
                    <td className="p-2 text-center">{l.delta.toFixed(1)}</td>
                    <td className={`p-2 text-center font-semibold ${l.condicion === "Peligro" ? "text-destructive" : "text-warning"}`}>{l.condicion}</td>
                    <td className="p-1">
                      <Input className="h-7 text-xs" value={p.ordenes[l.tag] || ""}
                        onChange={(e) => { const v = e.target.value; p.setOrdenes((o) => ({ ...o, [l.tag]: v })); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Fotografías por estación (máx. {MAX_STATION_PHOTOS} c/u)</p>
        <p className="text-xs text-muted-foreground">Cada estación con fotos genera su página en el PDF, con el gráfico de las últimas 3 semanas de los spools fotografiados.</p>
        {ctx.stations.map((st) => {
          const spools = ctx.spools.filter((s) => s.station_id === st.id);
          const ex = p.existing.filter((x) => x.station_code === st.code);
          const nw = p.newPhotos.map((x, i) => ({ ...x, i })).filter((x) => x.station_code === st.code);
          const full = ex.length + nw.length >= MAX_STATION_PHOTOS;
          return (
            <div key={st.id} className="rounded-md border p-3 bg-muted/20 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm flex-1 min-w-[140px]">Estación {st.name}</span>
                <span className="text-xs text-muted-foreground">{ex.length + nw.length}/{MAX_STATION_PHOTOS}</span>
                <Select value={pendingTag[st.code] || ""} onValueChange={(v) => setPendingTag((t) => ({ ...t, [st.code]: v }))}>
                  <SelectTrigger className="w-48 h-8"><SelectValue placeholder="TAG del spool" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {spools.map((s) => <SelectItem key={s.id} value={s.tag}>{s.tag}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button asChild size="sm" variant="outline" disabled={full}>
                  <label className="cursor-pointer">
                    <Camera className="h-3 w-3 mr-1" /> Subir foto
                    <input type="file" accept="image/*" className="hidden" disabled={full}
                      onChange={(e) => { addPhoto(st.code, e.target.files); e.target.value = ""; }} />
                  </label>
                </Button>
              </div>
              {(ex.length > 0 || nw.length > 0) && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {ex.map((x) => (
                    <Thumb key={x.id} url={x.url} tag={x.spool_tag} onRemove={() => p.onRemoveExisting(x.id)} />
                  ))}
                  {nw.map((x) => (
                    <Thumb key={`n${x.i}`} url={x.preview} tag={x.spool_tag}
                      onRemove={() => p.setNewPhotos((a) => a.filter((_, j) => j !== x.i))} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Thumb({ url, tag, onRemove }: { url: string; tag: string; onRemove: () => void }) {
  return (
    <div className="relative border rounded overflow-hidden bg-background">
      {url && <img src={url} alt={tag} className="w-full h-20 object-cover" />}
      <button type="button" onClick={onRemove}
        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
        <X className="h-3 w-3" />
      </button>
      <div className="text-[10px] font-mono text-center p-0.5 truncate">{tag}</div>
    </div>
  );
}
