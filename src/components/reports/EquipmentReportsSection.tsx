import { useState } from "react";
import { FileText, Download, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEquipmentReports, useDeleteReport, ReportRow, reportToPdfData } from "@/hooks/useReports";
import { ReportFormDialog } from "./ReportFormDialog";
import { generateReportPdf, reportFileName } from "@/lib/pdfReport";
import { toast } from "sonner";

interface Props {
  equipmentId: string;
  equipmentTag: string;
  equipmentName: string;
  area: string;
  system: string;
  defaultWeek?: number;
  defaultYear?: number;
  defaultStatus?: string;
}

export function EquipmentReportsSection(props: Props) {
  const { data: reports, isLoading } = useEquipmentReports(props.equipmentId);
  const del = useDeleteReport();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function download(r: ReportRow) {
    try {
      setDownloadingId(r.id);
      const blob = await generateReportPdf({
        ...reportToPdfData(r),
        tituloId: `${props.equipmentTag} — ${props.equipmentName}`,
        procesoArea: r.proceso_area || `${props.area} / ${props.system}`,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(r.tipo, props.equipmentTag, r.fecha_informe || r.fecha_inspeccion);
      a.click();
      URL.revokeObjectURL(url);
      const kb = (blob.size / 1024).toFixed(0);
      toast.success(`PDF descargado (${kb} KB)`);
    } catch (e: any) {
      toast.error("Error PDF: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Informes técnicos</p>
          <Badge variant="secondary">{reports?.length || 0}</Badge>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-3 w-3 mr-1" /> Nuevo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : reports && reports.length > 0 ? (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{r.tipo}</Badge>
                  <span className="text-xs text-muted-foreground">
                    S{r.week_number}/{r.year} · {r.fecha_inspeccion}
                  </span>
                  <Badge variant="secondary" className="text-xs">{r.status_resultante}</Badge>
                </div>
                {r.hallazgos && <p className="text-xs text-muted-foreground truncate mt-1">{r.hallazgos}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => download(r)} disabled={downloadingId === r.id}>
                  {downloadingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm("¿Eliminar informe?")) del.mutate(r.id);
                }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin informes registrados.</p>
      )}

      <ReportFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultEquipmentId={props.equipmentId}
        defaultWeek={props.defaultWeek}
        defaultYear={props.defaultYear}
        defaultStatus={props.defaultStatus}
      />
    </div>
  );
}
