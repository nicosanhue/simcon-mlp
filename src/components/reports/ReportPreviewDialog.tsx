import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generateReportPdf, reportFileName, ReportPdfData } from "@/lib/pdfReport";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: ReportPdfData | null;
  fileName: string;
}

export function ReportPreviewDialog({ open, onOpenChange, data, fileName }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (open && data) {
      setLoading(true);
      generateReportPdf(data)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setSize(blob.size);
        })
        .catch((e: any) => toast.error("Error PDF: " + e.message))
        .finally(() => !cancelled && setLoading(false));
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      setSize(0);
    };
  }, [open, data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-4 gap-3">
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
          <DialogTitle className="text-base truncate">
            Vista previa — {fileName}
            {size > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {(size / 1024).toFixed(0)} KB
              </span>
            )}
          </DialogTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!url}
            onClick={() => {
              if (!url) return;
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.click();
            }}
          >
            <Download className="h-4 w-4 mr-1" /> Descargar
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-0 rounded-md border bg-muted/30">
          {loading || !url ? (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Generando informe...
            </div>
          ) : (
            <iframe src={`${url}#view=FitH`} title="Informe PDF" className="w-full h-full rounded-md" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { reportFileName };
