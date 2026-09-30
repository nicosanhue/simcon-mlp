import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { toast } from "sonner";
import { planoPathOf, planoSignedUrl } from "@/lib/stcPlanos";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stationCode: string | null;
}

// Visor pop-up de planos PDF: renderiza todas las páginas con pdf.js,
// ajustadas al ancho y con scroll vertical.
export function PlanoViewerDialog({ open, onOpenChange, stationCode }: Props) {
  const path = stationCode ? planoPathOf(stationCode) : null;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    let doc: any = null;
    let canvases: HTMLCanvasElement[] = [];

    async function run() {
      if (!open || !path) return;
      setLoading(true);
      setRenderError(null);
      try {
        const signed = await planoSignedUrl(path);
        if (cancelled || !signed) throw new Error("No se pudo obtener el plano");
        const res = await fetch(signed);
        if (!res.ok) throw new Error("No se pudo descargar el plano");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);

        const buf = await blob.arrayBuffer();
        if (cancelled) return;
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const targetW = Math.max(320, container.clientWidth - 24);
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: (targetW / base.width) * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.className = "mx-auto rounded shadow-sm bg-background";
          container.appendChild(canvas);
          canvases.push(canvas);

          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (i < doc.numPages) {
            const gap = document.createElement("div");
            gap.className = "h-3";
            container.appendChild(gap);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setRenderError(e?.message || "No se pudo mostrar el plano");
          toast.error("Error plano: " + (e?.message ?? e));
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
      canvases = [];
      setUrl(null);
      setRenderError(null);
    };
  }, [open, path]);

  const download = async () => {
    if (!path || !stationCode) return;
    try {
      const { downloadPlanoPdf } = await import("@/lib/stcPlanos");
      await downloadPlanoPdf(stationCode);
    } catch (e: any) {
      toast.error("Error al descargar: " + (e?.message ?? e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-4 gap-3">
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
          <DialogTitle className="text-base truncate">
            Plano — {stationCode}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={!url} onClick={() => url && window.open(url, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" /> Abrir en pestaña
            </Button>
            <Button size="sm" variant="outline" disabled={!path} onClick={download}>
              <Download className="h-4 w-4 mr-1" /> Descargar
            </Button>
          </div>
        </DialogHeader>

        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-md border bg-muted/30 p-3"
        >
          {loading && (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando plano...
            </div>
          )}
          {!loading && renderError && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>No se pudo mostrar el plano aquí: {renderError}</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
