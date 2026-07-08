import { useState } from "react";
import { AlertTriangle, AlertCircle, Clock, CheckCircle2, XCircle, HelpCircle, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReportsIndex } from "@/hooks/useReports";
import { EquipmentReportsSection } from "@/components/reports/EquipmentReportsSection";

interface Alert {
  id: string;
  tag: string;
  name: string;
  status: "Crítico" | "Alerta" | "Satisfactorio" | "Seguimiento" | "Sin medición";
  area: string;
  system: string;
  description?: string;
  plannedDate?: string;
  sapNotification?: string;
  sapOrder?: string;
}

interface CriticalAlertsListProps {
  alerts: Alert[];
  activeFilter?: "Crítico" | "Alerta" | "Satisfactorio" | "Seguimiento" | "Sin medición" | null;
  week: number;
  year: number;
}

const statusStyles = {
  Crítico: {
    bg: "bg-status-falla/5",
    border: "border-status-falla/30",
    hoverBg: "hover:bg-status-falla/10",
    iconBg: "bg-status-falla/20",
    iconColor: "text-status-falla",
    badgeBorder: "border-status-falla/50",
    badgeText: "text-status-falla",
    badgeBg: "bg-status-falla/10",
    pulse: "pulse-danger",
  },
  Alerta: {
    bg: "bg-status-alerta/5",
    border: "border-status-alerta/30",
    hoverBg: "hover:bg-status-alerta/10",
    iconBg: "bg-status-alerta/20",
    iconColor: "text-status-alerta",
    badgeBorder: "border-status-alerta/50",
    badgeText: "text-status-alerta",
    badgeBg: "bg-status-alerta/10",
    pulse: "",
  },
  Satisfactorio: {
    bg: "bg-status-operativo/5",
    border: "border-status-operativo/30",
    hoverBg: "hover:bg-status-operativo/10",
    iconBg: "bg-status-operativo/20",
    iconColor: "text-status-operativo",
    badgeBorder: "border-status-operativo/50",
    badgeText: "text-status-operativo",
    badgeBg: "bg-status-operativo/10",
    pulse: "",
  },
  Seguimiento: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/30",
    hoverBg: "hover:bg-blue-500/10",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-500",
    badgeBorder: "border-blue-500/50",
    badgeText: "text-blue-500",
    badgeBg: "bg-blue-500/10",
    pulse: "",
  },
  "Sin medición": {
    bg: "bg-status-sinmedicion/5",
    border: "border-status-sinmedicion/30",
    hoverBg: "hover:bg-status-sinmedicion/10",
    iconBg: "bg-status-sinmedicion/20",
    iconColor: "text-status-sinmedicion",
    badgeBorder: "border-status-sinmedicion/50",
    badgeText: "text-status-sinmedicion",
    badgeBg: "bg-status-sinmedicion/10",
    pulse: "",
  },
};

const getStatusIcon = (status: string, className: string) => {
  switch (status) {
    case "Crítico": return <XCircle className={className} />;
    case "Alerta": return <AlertTriangle className={className} />;
    case "Satisfactorio": return <CheckCircle2 className={className} />;
    case "Seguimiento": return <Clock className={className} />;
    case "Sin medición": return <HelpCircle className={className} />;
    default: return <AlertCircle className={className} />;
  }
};

export function CriticalAlertsList({ alerts, activeFilter, week, year }: CriticalAlertsListProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const { data: reportsIndex } = useReportsIndex(week, year);

  const pendingCount = alerts.filter(
    (a) => (a.status === "Crítico" || a.status === "Alerta") && !reportsIndex?.has(a.id)
  ).length;

  if (alerts.length === 0) {
    return (
      <div className="industrial-panel p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Alertas Críticas
          {activeFilter && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (filtrando por {activeFilter})
            </span>
          )}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-operativo/10 mb-3">
            <AlertCircle className="h-6 w-6 text-status-operativo" />
          </div>
          <p className="text-muted-foreground">
            {activeFilter ? `Sin equipos en ${activeFilter}` : "Sin alertas críticas"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilter ? "Haz clic en la tarjeta para quitar el filtro" : "Todos los equipos satisfactorios"}
          </p>
        </div>
      </div>
    );
  }

  const isSafeFilter = activeFilter === "Satisfactorio" || activeFilter === "Seguimiento" || activeFilter === "Sin medición";

  return (
    <>
      <div className="industrial-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isSafeFilter ? `Equipos en ${activeFilter}` : "Alertas Críticas"}
            {activeFilter && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (filtrando por {activeFilter})
              </span>
            )}
          </h3>
          <Badge variant={isSafeFilter ? "secondary" : "destructive"} className={!isSafeFilter ? "animate-pulse-glow" : ""}>
            {alerts.length} {alerts.length === 1 ? "equipo" : "equipos"}
          </Badge>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {alerts.map((alert) => {
            const styles = statusStyles[alert.status] || statusStyles.Satisfactorio;
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={cn(
                  "p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md",
                  styles.bg, styles.border, styles.hoverBg, styles.pulse
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.iconBg)}>
                    {getStatusIcon(alert.status, cn("h-4 w-4", styles.iconColor))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-primary">{alert.tag}</span>
                      <Badge variant="outline" className={cn("text-xs", styles.badgeBorder, styles.badgeText)}>
                        {alert.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1 truncate">{alert.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.area} • {alert.system}</p>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{alert.description}</p>
                    )}
                    {alert.plannedDate && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Fecha plan: {alert.plannedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedAlert && (() => {
            const styles = statusStyles[selectedAlert.status] || statusStyles.Satisfactorio;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", styles.iconBg)}>
                      {getStatusIcon(selectedAlert.status, cn("h-5 w-5", styles.iconColor))}
                    </div>
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        <span className="font-mono">{selectedAlert.tag}</span>
                        <Badge variant="outline" className={cn("text-xs", styles.badgeBorder, styles.badgeText, styles.badgeBg)}>
                          {selectedAlert.status}
                        </Badge>
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">{selectedAlert.name}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ubicación</p>
                    <p className="text-sm text-foreground">{selectedAlert.area} › {selectedAlert.system}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Condición Técnica</p>
                    <div className={cn("p-3 rounded-lg border text-sm", styles.bg, styles.border)}>
                      {selectedAlert.description || "Sin descripción disponible"}
                    </div>
                  </div>
                  {(selectedAlert.sapNotification || selectedAlert.sapOrder) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedAlert.sapNotification && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Aviso SAP</p>
                          <div className="p-2 rounded-md border bg-muted/30 text-sm font-mono text-foreground">
                            {selectedAlert.sapNotification}
                          </div>
                        </div>
                      )}
                      {selectedAlert.sapOrder && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Orden de Trabajo (OT)</p>
                          <div className="p-2 rounded-md border bg-muted/30 text-sm font-mono text-foreground">
                            {selectedAlert.sapOrder}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedAlert.plannedDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fecha Planificada</p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedAlert.plannedDate}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
