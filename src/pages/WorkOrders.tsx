import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lookupAvisos, normAviso, syncSapToWeekly } from "@/lib/sapLookup";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkOrderRow {
  reportId: string;
  equipmentId: string;
  tag: string;
  equipmentName: string;
  areaId: string;
  areaName: string;
  systemName: string;
  status: string;
  criticality: string;
  sapNotification: string | null;
  sapOrder: string | null;
  plannedDate: string | null;
  week: number;
  year: number;
}

const PAGE_SIZE = 1000;

async function fetchLatestWeekWorkOrders(): Promise<WorkOrderRow[]> {
  // 1) Discover the latest week overall
  const { data: latestRows, error: latestErr } = await supabase
    .from("weekly_reports")
    .select("year, week_number")
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(1);

  if (latestErr) throw latestErr;
  if (!latestRows || latestRows.length === 0) return [];

  const latestYear = latestRows[0].year;
  const latestWeek = latestRows[0].week_number;

  // 2) Fetch ALL records for latest week, then filter client-side
  let all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from("weekly_reports")
      .select(`
        id, week_number, year, status, sap_notification, sap_order, planned_date,
        equipment:equipment_id (
          id, tag, name, criticality,
          systems:system_id ( name, areas:area_id ( id, name ) )
        )
      `)
      .eq("year", latestYear)
      .eq("week_number", latestWeek)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all = [...all, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else hasMore = false;
  }

  return all
    .filter((r: any) => r.equipment)
    .filter((r: any) =>
      r.status === "Crítico" ||
      r.status === "Alerta" ||
      r.sap_notification ||
      r.sap_order ||
      r.planned_date
    )
    .map((r: any) => ({
      reportId: r.id,
      equipmentId: r.equipment.id,
      tag: r.equipment.tag,
      equipmentName: r.equipment.name,
      areaId: r.equipment.systems?.areas?.id ?? "",
      areaName: r.equipment.systems?.areas?.name ?? "—",
      systemName: r.equipment.systems?.name ?? "—",
      status: r.status,
      criticality: r.equipment.criticality ?? "Media",
      sapNotification: r.sap_notification,
      sapOrder: r.sap_order,
      plannedDate: r.planned_date,
      week: r.week_number,
      year: r.year,
    }));
}

function statusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "Crítico") return "destructive";
  if (status === "Alerta") return "default";
  return "secondary";
}

export default function WorkOrders() {
  const [areaId, setAreaId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const areasQuery = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id, name").neq("name", "Control Temperatura").order("name");
      if (error) throw error;
      return data;
    },
  });

  const ordersQuery = useQuery<WorkOrderRow[]>({
    queryKey: ["work-orders"],
    queryFn: fetchLatestWeekWorkOrders,
  });

  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const avisoKeys = useMemo(
    () => [...new Set((ordersQuery.data ?? []).map((r) => normAviso(r.sapNotification)).filter((a) => /^\d+$/.test(a)))].sort(),
    [ordersQuery.data],
  );
  const sapQuery = useQuery({
    queryKey: ["sap-lookup-bulk", avisoKeys],
    queryFn: () => lookupAvisos(avisoKeys),
    enabled: avisoKeys.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const today = new Date().toISOString().slice(0, 10);
  const sapOf = (r: WorkOrderRow) => sapQuery.data?.[normAviso(r.sapNotification)];
  const isLate = (r: WorkOrderRow) => {
    const s = sapOf(r);
    return !!(s?.ot_abierta && s.fecha_inicio_extrema && s.fecha_inicio_extrema < today);
  };

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncSapToWeekly();
      toast.success(`SAP: ${res.actualizados} registros completados`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["work-orders"] }),
        qc.invalidateQueries({ queryKey: ["sap-lookup-bulk"] }),
      ]);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo consultar SAP");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const rows = ordersQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (areaId !== "all" && r.areaId !== areaId) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        r.tag.toLowerCase().includes(term) ||
        r.equipmentName.toLowerCase().includes(term) ||
        (r.sapNotification ?? "").toLowerCase().includes(term) ||
        (r.sapOrder ?? "").toLowerCase().includes(term)
      );
    });
  }, [ordersQuery.data, areaId, statusFilter, search]);

  // Group by area only
  const grouped = useMemo(() => {
    const byArea = new Map<string, WorkOrderRow[]>();
    for (const row of filtered) {
      if (!byArea.has(row.areaName)) byArea.set(row.areaName, []);
      byArea.get(row.areaName)!.push(row);
    }
    // Sort each area's rows by tag then equipment name
    for (const [, rows] of byArea) {
      rows.sort((a, b) => {
        const tagCmp = a.tag.localeCompare(b.tag);
        return tagCmp !== 0 ? tagCmp : a.equipmentName.localeCompare(b.equipmentName);
      });
    }
    return byArea;
  }, [filtered]);

  const totalAvisos = filtered.filter((r) => r.sapNotification).length;
  const totalOTs = filtered.filter((r) => r.sapOrder || sapOf(r)?.orden_principal).length;
  const totalLate = filtered.filter(isLate).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avisos y Órdenes de Trabajo</h1>
            <p className="text-muted-foreground mt-1">
              Listado de avisos SAP y OT por área y equipo, correspondientes a la última semana registrada. OT y fechas en vivo desde SAP (IW29/IW39).
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing || sapQuery.isFetching}>
            {syncing || sapQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar desde SAP
          </Button>
        </div>
        {sapQuery.isError && (
          <div className="industrial-panel p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> No se pudo consultar SAP; se muestran los datos guardados.
          </div>
        )}

        {/* Filters */}
        <div className="industrial-panel p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por TAG, equipo, aviso u OT…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Filtrar por área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areasQuery.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Satisfactorio">Satisfactorio</SelectItem>
              <SelectItem value="Seguimiento">Seguimiento</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
              <SelectItem value="Alerta">Alerta</SelectItem>
              <SelectItem value="Sin medición">Sin medición</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="industrial-panel p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Registros</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </div>
          <div className="industrial-panel p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avisos SAP</p>
            <p className="text-2xl font-bold text-foreground">{totalAvisos}</p>
          </div>
          <div className="industrial-panel p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Órdenes de Trabajo</p>
            <p className="text-2xl font-bold text-foreground">{totalOTs}</p>
          </div>
          <div className="industrial-panel p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">OT abiertas atrasadas</p>
            <p className="text-2xl font-bold text-destructive">{sapQuery.isLoading ? "…" : totalLate}</p>
          </div>
        </div>

        {/* Content */}
        {ordersQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Sin resultados</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              No se encontraron avisos u órdenes de trabajo para la última semana registrada.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([area, rows]) => (
              <div key={area} className="industrial-panel p-4">
                <h2 className="text-lg font-semibold text-foreground mb-3">{area}</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Semana</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Aviso SAP</TableHead>
                      <TableHead>OT</TableHead>
                      <TableHead>Inicio extremo (SAP)</TableHead>
                      <TableHead>Estado OT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.reportId}>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">{r.tag}</span>
                          <span className="text-muted-foreground ml-1">· {r.equipmentName}</span>
                          <span className="text-muted-foreground text-xs block">{r.systemName}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">S{r.week}-{r.year}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.sapNotification ?? "—"}</TableCell>
                        {(() => {
                          const sap = sapOf(r);
                          const sapOt = sap?.orden_principal ?? null;
                          const ot = sapOt ?? r.sapOrder;
                          const differs = sapOt && r.sapOrder && normAviso(r.sapOrder) !== sapOt;
                          const fecha = sap?.fecha_inicio_extrema ?? r.plannedDate;
                          const late = isLate(r);
                          return (
                            <>
                              <TableCell className="font-mono text-xs">
                                {ot ?? "—"}
                                {differs && (
                                  <span className="block text-[10px] text-muted-foreground" title="OT guardada en SIMCON">
                                    SIMCON: {r.sapOrder}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className={late ? "whitespace-nowrap text-destructive font-semibold" : "whitespace-nowrap"}>
                                {fecha ? new Date(fecha.slice(0, 10) + "T00:00").toLocaleDateString("es-CL") : "—"}
                              </TableCell>
                              <TableCell>
                                {sap?.ot_abierta == null ? (
                                  <span className="text-muted-foreground text-xs">{sapQuery.isLoading && r.sapNotification ? "…" : "—"}</span>
                                ) : late ? (
                                  <Badge variant="destructive">Atrasada</Badge>
                                ) : sap.ot_abierta ? (
                                  <Badge variant="default">Abierta</Badge>
                                ) : (
                                  <Badge variant="secondary">Cerrada</Badge>
                                )}
                              </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
