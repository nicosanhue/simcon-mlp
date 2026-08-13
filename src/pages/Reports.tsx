import { useMemo, useState } from "react";
import { FileText, Download, Plus, Loader2, Pencil, Trash2, Search, Eye, LayoutList, Table2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReports, useDeleteReport, ReportRow, ReportTipo, reportToPdfData, isoWeekYear } from "@/hooks/useReports";
import { ReportFormDialog } from "@/components/reports/ReportFormDialog";
import { ReportsGroupedList, isoWeekRange } from "@/components/reports/ReportsGroupedList";
import { ReportPreviewDialog } from "@/components/reports/ReportPreviewDialog";
import { generateReportPdf, reportFileName, ReportPdfData } from "@/lib/pdfReport";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";

export default function Reports() {
  const { isEditor } = useProfile();
  const [tipo, setTipo] = useState<ReportTipo | "all">("all");
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [weekKey, setWeekKey] = useState("all");
  const [grouped, setGrouped] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ data: ReportPdfData; fileName: string } | null>(null);

  const { data: reports, isLoading } = useReports({ tipo, search });
  const del = useDeleteReport();

  const areaOf = (r: ReportRow) =>
    r.equipment?.systems?.areas?.name || (r.proceso_area || "").split("/")[0].trim() || "Sin área";

  const areas = useMemo(
    () => [...new Set((reports || []).map(areaOf))].sort(),
    [reports]
  );
  const weeks = useMemo(() => {
    const map = new Map<string, { week: number; year: number }>();
    (reports || []).forEach((r) => {
      const { week, year } = isoWeekYear(r.fecha_informe || r.fecha_inspeccion);
      map.set(`${year}-${String(week).padStart(2, "0")}`, { week, year });
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [reports]);

  const filtered = useMemo(
    () =>
      (reports || []).filter(
        (r) =>
          (area === "all" || areaOf(r) === area) &&
          (weekKey === "all" ||
            (() => {
              const { week, year } = isoWeekYear(r.fecha_informe || r.fecha_inspeccion);
              return `${year}-${String(week).padStart(2, "0")}` === weekKey;
            })())
      ),
    [reports, area, weekKey]
  );

  function fileNameOf(r: ReportRow) {
    return reportFileName(r.tipo, r.equipment?.tag, r.fecha_informe || r.fecha_inspeccion);
  }

  function view(r: ReportRow) {
    setPreview({ data: reportToPdfData(r), fileName: fileNameOf(r) });
  }

  async function download(r: ReportRow) {
    try {
      setDownloadingId(r.id);
      const blob = await generateReportPdf(reportToPdfData(r));

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameOf(r);
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF descargado (${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      toast.error("Error PDF: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  function remove(r: ReportRow) {
    if (confirm("¿Eliminar informe?")) del.mutate(r.id);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Informes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Repositorio de informes técnicos (Vibraciones, Termografía, Ultrasonido, Lubricación)
            </p>
          </div>
          {isEditor && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo informe
            </Button>
          )}
        </div>

        <div className="industrial-panel p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por Tag o Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="Vibraciones">Vibraciones</SelectItem>
              <SelectItem value="Termografia">Termografía</SelectItem>
              <SelectItem value="Ultrasonido">Ultrasonido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={weekKey} onValueChange={setWeekKey}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Semana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las semanas</SelectItem>
              {weeks.map(([key, w]) => (
                <SelectItem key={key} value={key}>
                  Semana {w.week} · {isoWeekRange(w.week, w.year)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setGrouped((g) => !g)}>
            {grouped ? <Table2 className="h-4 w-4 mr-1" /> : <LayoutList className="h-4 w-4 mr-1" />}
            {grouped ? "Vista tabla" : "Vista agrupada"}
          </Button>
        </div>

        {isLoading ? (
          <div className="industrial-panel p-8 text-center text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="industrial-panel p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Sin informes registrados</p>
          </div>
        ) : grouped ? (
          <ReportsGroupedList
            reports={filtered}
            isEditor={isEditor}
            downloadingId={downloadingId}
            onView={view}
            onDownload={download}
            onEdit={(r) => { setEditing(r); setOpen(true); }}
            onDelete={remove}
          />
        ) : (
          <div className="industrial-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Título / ID</th>
                  <th className="text-left p-3">Proceso / Área</th>
                  <th className="text-left p-3">Fecha informe</th>
                  <th className="text-left p-3">Condición general</th>
                  <th className="text-left p-3">Componentes</th>
                  <th className="text-right p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="p-3"><Badge variant="outline">{r.tipo}</Badge></td>
                    <td className="p-3">
                      <div className="font-mono text-primary text-xs">{r.equipment?.tag}</div>
                      <div className="text-xs text-muted-foreground">{r.equipment?.name}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.proceso_area || `${r.equipment?.systems?.areas?.name} › ${r.equipment?.systems?.name}`}
                    </td>
                    <td className="p-3">{r.fecha_informe || r.fecha_inspeccion}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{r.condicion_general || r.status_resultante}</Badge>
                    </td>
                    <td className="p-3">{r.items?.length || 0}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => view(r)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => download(r)} disabled={downloadingId === r.id}>
                          {downloadingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        </Button>
                        {isEditor && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportFormDialog open={open} onOpenChange={setOpen} editing={editing} />
      <ReportPreviewDialog
        open={!!preview}
        onOpenChange={(v) => !v && setPreview(null)}
        data={preview?.data || null}
        fileName={preview?.fileName || "informe.pdf"}
      />
    </MainLayout>
  );
}
