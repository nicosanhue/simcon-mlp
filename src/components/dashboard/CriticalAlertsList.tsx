import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  tag: string;
  name: string;
  status: "Falla" | "Alerta";
  area: string;
  system: string;
  description?: string;
  plannedDate?: string;
}

interface CriticalAlertsListProps {
  alerts: Alert[];
  activeFilter?: "Falla" | "Alerta" | null;
}

export function CriticalAlertsList({ alerts, activeFilter }: CriticalAlertsListProps) {
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
            {activeFilter ? "Haz clic en la tarjeta para quitar el filtro" : "Todos los equipos operativos"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Alertas Críticas
          {activeFilter && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (filtrando por {activeFilter})
            </span>
          )}
        </h3>
        <Badge variant="destructive" className="animate-pulse-glow">
          {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
        </Badge>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "p-4 rounded-lg border transition-colors",
              alert.status === "Falla" 
                ? "bg-status-falla/5 border-status-falla/30 pulse-danger" 
                : "bg-status-alerta/5 border-status-alerta/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                alert.status === "Falla" ? "bg-status-falla/20" : "bg-status-alerta/20"
              )}>
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  alert.status === "Falla" ? "text-status-falla" : "text-status-alerta"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {alert.tag}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      alert.status === "Falla" 
                        ? "border-status-falla/50 text-status-falla" 
                        : "border-status-alerta/50 text-status-alerta"
                    )}
                  >
                    {alert.status}
                  </Badge>
                </div>
                <p className="text-sm text-foreground mt-1 truncate">{alert.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alert.area} • {alert.system}
                </p>
                {alert.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {alert.description}
                  </p>
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
        ))}
      </div>
    </div>
  );
}
