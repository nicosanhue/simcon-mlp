import { useState } from "react";
import { FileText, Download, Plus, Loader2, Pencil, Trash2, Search } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReports, useDeleteReport, ReportRow, ReportTipo, reportToPdfData } from "@/hooks/useReports";
import { ReportFormDialog } from "@/components/reports/ReportFormDialog";
import { generateReportPdf, reportFileName } from "@/lib/pdfReport";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";

export default function Reports() {
  const { isEditor } = useProfile();
  const [tipo, setTipo] = useState<ReportTipo | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports, isLoading } = useReports({ tipo, search });
  const del = useDeleteReport();

  async function download(r: ReportRow) {
    try {
      setDownloadingId(r.id);
      const blob = await generateReportPdf(reportToPdfData(r));

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(r.tipo, r.equipment?.tag, r.fecha_informe || r.fecha_inspeccion);
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF descargado (${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      toast.error("Error PDF: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Informes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Repositorio de informes técnicos (Vibraciones, Termografía, Ultrasonido)
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
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="Vibraciones">Vibraciones</SelectItem>
              <SelectItem value="Termografia">Termografía</SelectItem>
              <SelectItem value="Ultrasonido">Ultrasonido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="industrial-panel">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : !reports || reports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Sin informes registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Título / ID</th>
                  <th className="text-left p-3">Proceso / Área</th>
                  <th className="text-left p-3">Semana</th>
                  <th className="text-left p-3">Fecha informe</th>
                  <th className="text-left p-3">Condición general</th>
                  <th className="text-left p-3">Componentes</th>
                  <th className="text-right p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="p-3"><Badge variant="outline">{r.tipo}</Badge></td>
                    <td className="p-3">
                      <div className="font-mono text-primary text-xs">{r.equipment?.tag}</div>
                      <div className="text-xs text-muted-foreground">{r.equipment?.name}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.proceso_area || `${r.equipment?.systems?.areas?.name} › ${r.equipment?.systems?.name}`}
                    </td>
                    <td className="p-3">S{r.week_number}/{r.year}</td>
                    <td className="p-3">{r.fecha_informe || r.fecha_inspeccion}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{r.condicion_general || r.status_resultante}</Badge>
                    </td>
                    <td className="p-3">{r.items?.length || 0}</td>

                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => download(r)} disabled={downloadingId === r.id}>
                          {downloadingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        </Button>
                        {isEditor && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (confirm("¿Eliminar informe?")) del.mutate(r.id);
                            }}>
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
          )}
        </div>
      </div>

      <ReportFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </MainLayout>
  );
}
