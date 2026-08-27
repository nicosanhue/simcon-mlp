import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  LubManual,
  downloadManual,
  useDeleteManual,
  useLubManuals,
  useUploadManual,
} from "@/hooks/useLubricacion";

interface Props {
  systemId?: string;
  systemName?: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function humanSize(bytes?: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function LubDocsDialog({ systemId, systemName, canEdit, open, onOpenChange }: Props) {
  const manuals = useLubManuals();
  const upload = useUploadManual();
  const del = useDeleteManual();
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = (manuals.data || []).filter((m) => m.system_id === systemId);

  async function handleFiles(files: File[]) {
    if (!systemId || !files.length) return;
    try {
      for (const f of files) await upload.mutateAsync({ systemId, file: f });
      toast.success("Documentos subidos al sistema");
    } catch (e: any) {
      toast.error("Error al subir: " + e.message);
    }
  }

  async function handleDownload(m: LubManual) {
    try {
      await downloadManual(m);
    } catch (e: any) {
      toast.error("Error al descargar: " + e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Documentos del sistema</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {systemName} — los archivos quedan disponibles para todos los equipos de este sistema.
          </p>
        </DialogHeader>

        {canEdit && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Subir documentos
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = "";
                handleFiles(files);
              }}
            />
          </div>
        )}

        {manuals.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
        ) : !docs.length ? (
          <p className="text-sm text-muted-foreground italic py-4">
            Sin documentos cargados para este sistema.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {docs.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{m.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {humanSize(m.size_bytes)}
                    {m.created_at ? ` · ${new Date(m.created_at).toLocaleDateString("es-CL")}` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDownload(m)} aria-label="Descargar">
                  <Download className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => del.mutate(m)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
