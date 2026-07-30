import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { generateReportPdf, reportFileName, ReportPdfData } from "@/lib/pdfReport";
import { toast } from "sonner";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  const [renderError, setRenderError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    let doc: any = null;

    async function run() {
      if (!open || !data) return;
      setLoading(true);
      setRenderError(null);
      try {
        const blob = await generateReportPdf(data);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setSize(blob.size);

        const buf = await blob.arrayBuffer();
        if (cancelled) return;
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const page = await doc.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const base = page.getViewport({ scale: 1 });
        const targetW = Math.max(320, container.clientWidth - 24);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (targetW / base.width) * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch (e: any) {
        if (!cancelled) {
          setRenderError(e?.message || "No se pudo renderizar el informe");
          toast.error("Error PDF: " + (e?.message ?? e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (doc) doc.destroy?.();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      setSize(0);
      setRenderError(null);
    };
  }, [open, data]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={!url} onClick={() => url && window.open(url, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" /> Abrir en pestaña
            </Button>
            <Button size="sm" variant="outline" disabled={!url} onClick={download}>
              <Download className="h-4 w-4 mr-1" /> Descargar
            </Button>
          </div>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto rounded-md border bg-muted/30 p-3">
          {loading && (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Generando informe...
            </div>
          )}
          {!loading && renderError && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>No se pudo mostrar el informe aquí: {renderError}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => url && window.open(url, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir en pestaña
                </Button>
                <Button size="sm" onClick={download}>
                  <Download className="h-4 w-4 mr-1" /> Descargar
                </Button>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`mx-auto rounded shadow-sm bg-background ${loading || renderError ? "hidden" : ""}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { reportFileName };
