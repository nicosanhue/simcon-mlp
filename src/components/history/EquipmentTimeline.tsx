import { EquipmentWithHistory } from "@/hooks/useEquipmentHistory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye,
  Calendar,
  FileText,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentTimelineProps {
  equipment: EquipmentWithHistory;
}

const statusConfig = {
  Satisfactorio: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    label: "Satisfactorio",
  },
  Seguimiento: {
    icon: Eye,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Seguimiento",
  },
  Alerta: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "Alerta",
  },
  "Crítico": {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Crítico",
  },
};

export function EquipmentTimeline({ equipment }: EquipmentTimelineProps) {
  const criticalityColors = {
    Alta: "bg-red-500/20 text-red-400 border-red-500/30",
    Media: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Baja: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Equipment Info Header */}
      <Card className="industrial-panel">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-xl font-bold text-primary">
                  {equipment.tag}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(criticalityColors[equipment.criticality as keyof typeof criticalityColors])}
                >
                  Criticidad {equipment.criticality}
                </Badge>
              </div>
              <CardTitle className="text-lg font-medium text-foreground">
                {equipment.name}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <span>{equipment.system.area.name}</span>
            <span>→</span>
            <span>{equipment.system.name}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {equipment.reports.length} registros históricos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Historial de Condición
        </h3>
        
        {equipment.reports.length === 0 ? (
          <Card className="industrial-panel">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No hay registros de condición para este equipo
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {equipment.reports.map((report, index) => {
                const config = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.Satisfactorio;
                const Icon = config.icon;
                
                return (
                  <div key={report.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2",
                      config.bgColor,
                      config.borderColor
                    )}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    {/* Content */}
                    <Card className={cn(
                      "flex-1 industrial-panel",
                      index === 0 && "ring-2 ring-primary/20"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(config.bgColor, config.color, "border-0")}>
                              {config.label}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Más reciente
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Semana {report.week_number}, {report.year}
                          </span>
                        </div>

                        {report.technical_description && (
                          <p className="text-sm text-foreground mb-3">
                            {report.technical_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {report.sap_notification && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Aviso: {report.sap_notification}</span>
                            </div>
                          )}
                          {report.sap_order && (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span>Orden: {report.sap_order}</span>
                            </div>
                          )}
                          {report.planned_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Fecha planificada: {new Date(report.planned_date).toLocaleDateString('es-CL')}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
