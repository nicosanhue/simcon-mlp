import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportRow } from "@/hooks/useReports";

export function isoWeekRange(week: number, year: number): string {
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayNum = (simple.getUTCDay() + 6) % 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dayNum + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(monday)} – ${fmt(sunday)} ${year}`;
}

function areaOf(r: ReportRow): string {
  return r.equipment?.systems?.areas?.name || (r.proceso_area || "").split("/")[0].trim() || "Sin área";
}

interface Props {
  reports: ReportRow[];
  isEditor: boolean;
  downloadingId: string | null;
  onView: (r: ReportRow) => void;
  onDownload: (r: ReportRow) => void;
  onEdit: (r: ReportRow) => void;
  onDelete: (r: ReportRow) => void;
}

export function ReportsGroupedList({
  reports,
  isEditor,
  downloadingId,
  onView,
  onDownload,
  onEdit,
  onDelete,
}: Props) {
  const groups = useMemo(() => {
    const byWeek = new Map<string, { week: number; year: number; rows: ReportRow[] }>();
    for (const r of reports) {
      const key = `${r.year}-${String(r.week_number).padStart(2, "0")}`;
      if (!byWeek.has(key)) byWeek.set(key, { week: r.week_number, year: r.year, rows: [] });
      byWeek.get(key)!.rows.push(r);
    }
    return [...byWeek.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, g]) => {
        const byArea = new Map<string, Map<string, ReportRow[]>>();
        for (const r of g.rows) {
          const area = areaOf(r);
          const fecha = r.fecha_informe || r.fecha_inspeccion;
          if (!byArea.has(area)) byArea.set(area, new Map());
          const dates = byArea.get(area)!;
          if (!dates.has(fecha)) dates.set(fecha, []);
          dates.get(fecha)!.push(r);
        }
        return {
          key,
          week: g.week,
          year: g.year,
          count: g.rows.length,
          areas: [...byArea.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([area, dates]) => ({
              area,
              count: [...dates.values()].reduce((s, v) => s + v.length, 0),
              dates: [...dates.entries()].sort((a, b) => b[0].localeCompare(a[0])),
            })),
        };
      });
  }, [reports]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isOpen = (id: string, defaultOpen: boolean) =>
    collapsed[id] === undefined ? defaultOpen : !collapsed[id];
  const toggle = (id: string, defaultOpen: boolean) =>
    setCollapsed((c) => ({ ...c, [id]: c[id] === undefined ? defaultOpen : !c[id] }));

  return (
    <div className="space-y-3">
      {groups.map((g, gi) => {
        const open = isOpen(g.key, gi === 0);
        return (
          <div key={g.key} className="industrial-panel overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/30 text-left"
              onClick={() => toggle(g.key, gi === 0)}
            >
              <div className="flex items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold">Semana {g.week}</span>
                <span className="text-xs text-muted-foreground">{isoWeekRange(g.week, g.year)}</span>
              </div>
              <Badge variant="secondary">{g.count} informes</Badge>
            </button>

            {open && (
              <div className="border-t divide-y">
                {g.areas.map((a) => {
                  const aid = `${g.key}-${a.area}`;
                  const aOpen = isOpen(aid, true);
                  return (
                    <div key={aid}>
                      <button
                        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/40 text-left"
                        onClick={() => toggle(aid, true)}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          {aOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <span className="font-medium">{a.area}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{a.count}</Badge>
                      </button>

                      {aOpen &&
                        a.dates.map(([fecha, rows]) => (
                          <div key={aid + fecha} className="px-4 py-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                              {fecha}
                            </p>
                            <ul className="space-y-1">
                              {rows.map((r) => (
                                <li
                                  key={r.id}
                                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-primary text-xs">
                                        {r.equipment?.tag}
                                      </span>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {r.equipment?.name}
                                      </span>
                                      <Badge variant="outline" className="text-[10px]">{r.tipo}</Badge>
                                      <Badge variant="secondary" className="text-[10px]">
                                        {r.condicion_general || r.status_resultante}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" onClick={() => onView(r)}>
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onDownload(r)}
                                      disabled={downloadingId === r.id}
                                    >
                                      {downloadingId === r.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Download className="h-3 w-3" />
                                      )}
                                    </Button>
                                    {isEditor && (
                                      <>
                                        <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
