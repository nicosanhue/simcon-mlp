import { Badge } from "@/components/ui/badge";
import type { SapState } from "@/lib/enexReport";

const MAP: Record<SapState, { label: string; cls: string }> = {
  SIN_AVISO: { label: "Sin aviso", cls: "bg-status-falla text-status-falla-foreground hover:bg-status-falla" },
  AVISO_SIN_OT: { label: "Aviso sin OT", cls: "bg-status-alerta text-status-alerta-foreground hover:bg-status-alerta" },
  OT_ABIERTA: { label: "OT abierta", cls: "bg-status-seguimiento text-primary-foreground hover:bg-status-seguimiento" },
  EJECUTADO: { label: "Ejecutado", cls: "bg-status-operativo text-primary-foreground hover:bg-status-operativo" },
  NO_REQUIERE: { label: "No requiere", cls: "" },
};

export function SapStateBadge({ state }: { state: SapState }) {
  const m = MAP[state];
  return state === "NO_REQUIERE" ? <Badge variant="secondary">{m.label}</Badge> : <Badge className={m.cls}>{m.label}</Badge>;
}
