import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useLubPhotos } from "@/hooks/useLubricacion";

interface Props {
  equipmentId?: string;
  title?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LubPhotoViewer({ equipmentId, title, open, onOpenChange }: Props) {
  const photos = useLubPhotos(open ? equipmentId : undefined);
  const [idx, setIdx] = useState(0);
  const list = photos.data || [];

  useEffect(() => {
    if (open) setIdx(0);
  }, [open, equipmentId]);

  const current = list[Math.min(idx, Math.max(list.length - 1, 0))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Fotografías {title ? `— ${title}` : ""}
            {list.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {Math.min(idx + 1, list.length)} / {list.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {photos.isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando fotografías...</p>
        ) : !list.length ? (
          <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">Este equipo no tiene fotografías.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative bg-muted/40 rounded-md flex items-center justify-center">
              <img
                src={current?.url}
                alt={current?.caption || "Fotografía del equipo"}
                className="max-h-[60vh] w-auto mx-auto object-contain rounded-md"
              />
              {list.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)}
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setIdx((i) => (i + 1) % list.length)}
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {list.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setIdx(i)}
                    className={`shrink-0 rounded-md border-2 ${i === idx ? "border-primary" : "border-transparent"}`}
                  >
                    <img
                      src={p.url}
                      alt={p.caption || "Miniatura"}
                      loading="lazy"
                      className="h-14 w-20 object-cover rounded-[4px]"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
