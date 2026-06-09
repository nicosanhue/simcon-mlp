import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search } from "lucide-react";
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
  // 1) Discover the latest week that has any notification/OT/planned date
  const { data: latestRows, error: latestErr } = await supabase
    .from("weekly_reports")
    .select("year, week_number")
    .or("sap_notification.not.is.null,sap_order.not.is.null,planned_date.not.is.null")
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(1);

  if (latestErr) throw latestErr;
  if (!latestRows || latestRows.length === 0) return [];

  const latestYear = latestRows[0].year;
  const latestWeek = latestRows[0].week_number;

  // 2) Fetch all records for that latest week
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
      .or("sap_notification.not.is.null,sap_order.not.is.null,planned_date.not.is.null")
      .order("year", { ascending: false })
      .order("week_number", { ascending: false })
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
  const [criticality, setCriticality] = useState<string>("all");
  const [search, setSearch] = useState("");

  const areasQuery = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const ordersQuery = useQuery<WorkOrderRow[]>({
    queryKey: ["work-orders"],
    queryFn: fetchLatestWeekWorkOrders,
  });

  const filtered = useMemo(() => {
    const rows = ordersQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (areaId !== "all" && r.areaId !== areaId) return false;
      if (criticality !== "all" && r.criticality !== criticality) return false;
      if (!term) return true;
      return (
        r.tag.toLowerCase().includes(term) ||
        r.equipmentName.toLowerCase().includes(term) ||
        (r.sapNotification ?? "").toLowerCase().includes(term) ||
        (r.sapOrder ?? "").toLowerCase().includes(term)
      );
    });
  }, [ordersQuery.data, areaId, criticality, search]);

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
  const totalOTs = filtered.filter((r) => r.sapOrder).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avisos y Órdenes de Trabajo</h1>
          <p className="text-muted-foreground mt-1">
            Listado de avisos SAP y OT por área y equipo, correspondientes a la última semana registrada.
          </p>
        </div>

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
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Filtrar por área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areasQuery.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      <TableHead>Fecha Programada</TableHead>
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
                        <TableCell className="font-mono text-xs">{r.sapOrder ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.plannedDate
                            ? new Date(r.plannedDate).toLocaleDateString("es-CL")
                            : "—"}
                        </TableCell>
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
