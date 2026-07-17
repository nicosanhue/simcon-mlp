import { useMemo, useState } from "react";
import {
  useCustomCharts,
  useCreateCustomChart,
  useDeleteCustomChart,
  type StcSpool,
  type StcStation,
  type StcReading,
} from "@/hooks/useStcData";
import { getStcStatus } from "@/lib/stcStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Plus, Trash2, LineChart as LineChartIcon } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";

interface Props {
  stations: StcStation[];
  spools: StcSpool[];
  readingsIndex: Map<string, Map<string, StcReading>>;
  latest?: { week: number; year: number };
}

export function CustomChartsSection({ stations, spools, readingsIndex, latest }: Props) {
  const { isEditor } = useProfile();
  const charts = useCustomCharts().data ?? [];
  const createChart = useCreateCustomChart();
  const deleteChart = useDeleteCustomChart();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const spoolById = useMemo(() => {
    const m = new Map<string, StcSpool>();
    spools.forEach((s) => m.set(s.id, s));
    return m;
  }, [spools]);

  const filteredSpools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spools.filter((s) => {
      if (stationFilter !== "all" && s.station_id !== stationFilter) return false;
      if (q && !s.tag.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [spools, stationFilter, search]);

  const resetForm = () => {
    setName("");
    setStationFilter("all");
    setSearch("");
    setSelected(new Set());
  };

  const toggleSpool = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    try {
      await createChart.mutateAsync({
        name: name.trim(),
        spool_ids: Array.from(selected),
      });
      toast.success("Seguimiento creado");
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message ?? "Error al crear seguimiento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChart.mutateAsync(id);
      toast.success("Seguimiento eliminado");
    } catch (e: any) {
      toast.error(e.message ?? "Error al eliminar");
    }
  };

  const buildChartData = (spool_ids: string[]) =>
    spool_ids
      .map((id) => spoolById.get(id))
      .filter((s): s is StcSpool => !!s)
      .map((sp) => {
        const r = latest
          ? readingsIndex.get(sp.id)?.get(`${latest.year}-${latest.week}`)
          : undefined;
        const v = r?.delta_t ?? 0;
        return { tag: sp.tag, delta: v, fill: getStcStatus(v).hex };
      });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" />
          Seguimiento Especial
        </h2>
        {isEditor && (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar seguimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Seguimiento Especial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre del seguimiento</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Spools críticos KM60"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Filtrar por estación</Label>
                  <Select value={stationFilter} onValueChange={setStationFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Buscar por TAG</Label>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar spool..."
                  />
                </div>
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selected).map((id) => {
                    const sp = spoolById.get(id);
                    if (!sp) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleSpool(id)}
                      >
                        {sp.tag} ✕
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="border rounded max-h-72 overflow-y-auto">
                {filteredSpools.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Sin resultados
                  </div>
                ) : (
                  filteredSpools.map((sp) => {
                    const station = stations.find((s) => s.id === sp.station_id);
                    return (
                      <label
                        key={sp.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={selected.has(sp.id)}
                          onCheckedChange={() => toggleSpool(sp.id)}
                        />
                        <span className="text-xs text-muted-foreground w-14">
                          {station?.code}
                        </span>
                        <span className="text-sm font-medium">{sp.tag}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.size} spool(s) seleccionado(s)
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !name.trim() || selected.size === 0 || createChart.isPending
                }
              >
                Crear gráfico
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {charts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aún no hay seguimientos especiales. Haz click en "Agregar seguimiento" para crear el primero.
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {charts.map((c) => {
            const data = buildChartData(c.spool_ids);
            return (
              <Card key={c.id} className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{c.name}</h3>
                  {isEditor && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-status-falla"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este seguimiento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará el gráfico "{c.name}". Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="tag"
                        angle={-60}
                        textAnchor="end"
                        interval={0}
                        height={60}
                        tick={{ fontSize: 9 }}
                      />
                      <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                      <ReTooltip
                        formatter={(v: number) => [`${Number(v).toFixed(2)} °C`, "ΔT"]}
                      />
                      <ReferenceLine y={2.5} stroke="#eab308" strokeDasharray="3 3" />
                      <ReferenceLine y={3.0} stroke="#f97316" strokeDasharray="3 3" />
                      <ReferenceLine y={3.5} stroke="#ef4444" strokeDasharray="3 3" />
                      <Bar dataKey="delta">
                        {data.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
