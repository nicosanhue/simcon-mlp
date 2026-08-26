import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, ChevronDown, Download, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  LubEquipmentRow,
  LubManual,
  openManual,
  useDeleteManual,
  useLubManuals,
  useUploadManual,
} from "@/hooks/useLubricacion";

const AREA_ORDER = ["Transporte de Fluidos", "Tranque Mauro", "Puerto", "Desaladora"];

function sortAreas(a: string, b: string) {
  const idxA = AREA_ORDER.indexOf(a);
  const idxB = AREA_ORDER.indexOf(b);
  const rankA = idxA === -1 ? AREA_ORDER.length : idxA;
  const rankB = idxB === -1 ? AREA_ORDER.length : idxB;
  return rankA - rankB || a.localeCompare(b);
}

interface Props {
  rows: LubEquipmentRow[];
  canEdit: boolean;
}

export function LubManualsSection({ rows, canEdit }: Props) {
  const { data: manuals } = useLubManuals();
  const upload = useUploadManual();
  const del = useDeleteManual();
  const [target, setTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);


  const tree = useMemo(() => {
    const areas = new Map<string, Map<string, { id: string; name: string }>>();
    for (const r of rows) {
      if (!areas.has(r.areaName)) areas.set(r.areaName, new Map());
      areas.get(r.areaName)!.set(r.system_id, { id: r.system_id, name: r.systemName });
    }
    return Array.from(areas.entries())
      .sort((a, b) => sortAreas(a[0], b[0]))
      .map(([area, sys]) => ({
        area,
        systems: Array.from(sys.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [rows]);

  const bySystem = useMemo(() => {
    const m = new Map<string, LubManual[]>();
    for (const man of manuals || []) {
      (m.get(man.system_id) || m.set(man.system_id, []).get(man.system_id)!).push(man);
    }
    return m;
  }, [manuals]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Manuales por sistema
          <Badge variant="secondary">{manuals?.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !target) return;
            try {
              await upload.mutateAsync({ systemId: target, file });
              toast.success("Manual subido");
            } catch (err: any) {
              toast.error("Error al subir: " + err.message);
            }
          }}
        />
        {tree.map((a) => (
          <Collapsible key={a.area} defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm font-semibold">
              <span>{a.area}</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-3 pt-2">
              {a.systems.map((s) => {
                const list = bySystem.get(s.id) || [];
                return (
                  <div key={s.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{list.length}</Badge>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTarget(s.id);
                              setTimeout(() => fileRef.current?.click(), 0);
                            }}
                            disabled={upload.isPending}
                          >
                            {upload.isPending && target === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    {list.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {list.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">{m.nombre}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openManual(m).catch(() => toast.error("No se pudo abrir"))}>
                                <Download className="h-3 w-3" />
                              </Button>
                              {canEdit && (
                                <Button size="sm" variant="ghost" onClick={() => del.mutate(m)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
