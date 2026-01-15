import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Cpu, Layers, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  name: string;
  tag: string;
  criticality: string;
}

interface System {
  id: string;
  name: string;
  equipment: Equipment[];
}

interface Area {
  id: string;
  name: string;
  systems: System[];
}

export default function EquipmentTree() {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['equipment-tree'],
    queryFn: async () => {
      // Fetch all areas
      const { data: areas, error: areasError } = await supabase
        .from('areas')
        .select('id, name')
        .order('name');
      
      if (areasError) throw areasError;

      // Fetch all systems with their area_id
      const { data: systems, error: systemsError } = await supabase
        .from('systems')
        .select('id, name, area_id')
        .order('name');
      
      if (systemsError) throw systemsError;

      // Fetch all equipment with their system_id
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, name, tag, criticality, system_id')
        .order('tag');
      
      if (equipmentError) throw equipmentError;

      // Build the tree structure
      const tree: Area[] = areas.map(area => ({
        id: area.id,
        name: area.name,
        systems: systems
          .filter(sys => sys.area_id === area.id)
          .map(sys => ({
            id: sys.id,
            name: sys.name,
            equipment: equipment
              .filter(eq => eq.system_id === sys.id)
              .map(eq => ({
                id: eq.id,
                name: eq.name,
                tag: eq.tag,
                criticality: eq.criticality
              }))
          }))
      }));

      return tree;
    }
  });

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  const toggleSystem = (systemId: string) => {
    setExpandedSystems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(systemId)) {
        newSet.delete(systemId);
      } else {
        newSet.add(systemId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (treeData) {
      setExpandedAreas(new Set(treeData.map(a => a.id)));
      setExpandedSystems(new Set(treeData.flatMap(a => a.systems.map(s => s.id))));
    }
  };

  const collapseAll = () => {
    setExpandedAreas(new Set());
    setExpandedSystems(new Set());
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'Alta':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Media':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Baja':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const totalStats = treeData ? {
    areas: treeData.length,
    systems: treeData.reduce((acc, a) => acc + a.systems.length, 0),
    equipment: treeData.reduce((acc, a) => acc + a.systems.reduce((acc2, s) => acc2 + s.equipment.length, 0), 0)
  } : { areas: 0, systems: 0, equipment: 0 };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organigrama de Equipos</h1>
            <p className="text-muted-foreground">Estructura jerárquica de áreas, sistemas y equipos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
            >
              Expandir todo
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Colapsar todo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.areas}</p>
                <p className="text-xs text-muted-foreground">Áreas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Layers className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.systems}</p>
                <p className="text-xs text-muted-foreground">Sistemas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Cpu className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.equipment}</p>
                <p className="text-xs text-muted-foreground">Equipos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Árbol de Equipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : treeData && treeData.length > 0 ? (
              <div className="space-y-1">
                {treeData.map(area => (
                  <div key={area.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Area Level */}
                    <button
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left",
                        expandedAreas.has(area.id) && "bg-primary/10"
                      )}
                    >
                      {expandedAreas.has(area.id) ? (
                        <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                      )}
                      {expandedAreas.has(area.id) ? (
                        <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Folder className="h-5 w-5 text-primary shrink-0" />
                      )}
                      <span className="font-semibold text-foreground">{area.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {area.systems.length} sistemas
                      </Badge>
                    </button>

                    {/* Systems Level */}
                    {expandedAreas.has(area.id) && area.systems.length > 0 && (
                      <div className="border-t border-border">
                        {area.systems.map(system => (
                          <div key={system.id} className="border-b border-border last:border-b-0">
                            <button
                              onClick={() => toggleSystem(system.id)}
                              className={cn(
                                "w-full flex items-center gap-2 p-3 pl-8 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left",
                                expandedSystems.has(system.id) && "bg-secondary/50"
                              )}
                            >
                              {expandedSystems.has(system.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">{system.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {system.equipment.length} equipos
                              </Badge>
                            </button>

                            {/* Equipment Level */}
                            {expandedSystems.has(system.id) && system.equipment.length > 0 && (
                              <div className="bg-background">
                                {system.equipment.map(eq => (
                                  <div
                                    key={eq.id}
                                    className="flex items-center gap-3 p-3 pl-16 border-t border-border/50 hover:bg-muted/30 transition-colors"
                                  >
                                    <Cpu className="h-4 w-4 text-accent-foreground shrink-0" />
                                    <span className="font-mono text-sm text-primary font-medium">{eq.tag}</span>
                                    <span className="text-sm text-foreground truncate">{eq.name}</span>
                                    <Badge className={cn("ml-auto text-xs", getCriticalityColor(eq.criticality))}>
                                      {eq.criticality}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}

                            {expandedSystems.has(system.id) && system.equipment.length === 0 && (
                              <div className="p-3 pl-16 text-sm text-muted-foreground italic bg-background">
                                Sin equipos registrados
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {expandedAreas.has(area.id) && area.systems.length === 0 && (
                      <div className="p-3 pl-8 text-sm text-muted-foreground italic border-t border-border">
                        Sin sistemas registrados
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
