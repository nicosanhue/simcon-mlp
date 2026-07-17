import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, Calendar, Filter, CheckCircle, AlertTriangle, XCircle, Clock, HelpCircle } from "lucide-react";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { getISOWeek, getYear, startOfWeek, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useProfile } from "@/contexts/ProfileContext";

type EquipmentStatus = 'Satisfactorio' | 'Seguimiento' | 'Crítico' | 'Alerta' | 'Sin medición';

interface EquipmentWithReport {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  system_name: string;
  area_name: string;
  report_id: string | null;
  status: EquipmentStatus;
  technical_description: string | null;
  sap_notification: string | null;
  sap_order: string | null;
  planned_date: string | null;
  hasChanges: boolean;
}

const statusConfig: Record<EquipmentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Satisfactorio': { label: 'Satisfactorio', color: 'bg-status-operativo/20 text-status-operativo border-status-operativo/30', icon: <CheckCircle className="h-3 w-3" /> },
  'Seguimiento': { label: 'Seguimiento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Clock className="h-3 w-3" /> },
  'Alerta': { label: 'Alerta', color: 'bg-status-alerta/20 text-status-alerta border-status-alerta/30', icon: <AlertTriangle className="h-3 w-3" /> },
  'Crítico': { label: 'Crítico', color: 'bg-status-falla/20 text-status-falla border-status-falla/30', icon: <XCircle className="h-3 w-3" /> },
  'Sin medición': { label: 'Sin medición', color: 'bg-status-sinmedicion/20 text-status-sinmedicion border-status-sinmedicion/30', icon: <HelpCircle className="h-3 w-3" /> },
};

export default function DataEntry() {
  const { isEditor } = useProfile();
  const [selectedWeek, setSelectedWeek] = useState<number>(getISOWeek(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  const [equipment, setEquipment] = useState<EquipmentWithReport[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentWithReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  // Calculate week date range
  const getWeekDateRange = (week: number, year: number) => {
    const janFirst = new Date(year, 0, 1);
    const daysToAdd = (week - 1) * 7;
    const weekStart = startOfWeek(addDays(janFirst, daysToAdd), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return {
      start: format(weekStart, "d MMM", { locale: es }),
      end: format(weekEnd, "d MMM yyyy", { locale: es })
    };
  };

  const weekRange = getWeekDateRange(selectedWeek, selectedYear);

  // Fetch areas for filter
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from('areas').select('id, name').order('name');
      if (data) setAreas(data);
    };
    fetchAreas();
  }, []);

  // Fetch equipment with reports
  useEffect(() => {
    const fetchEquipment = async () => {
      setIsLoading(true);
      try {
        // Get all equipment with their systems and areas
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select(`
            id,
            tag,
            name,
            description,
            systems!inner (
              name,
              areas!inner (
                id,
                name
              )
            )
          `)
          .order('tag');

        if (equipmentError) throw equipmentError;

        // Get weekly reports for the selected week
        const { data: reportsData, error: reportsError } = await supabase
          .from('weekly_reports')
          .select('*')
          .eq('week_number', selectedWeek)
          .eq('year', selectedYear);

        if (reportsError) throw reportsError;

        // Create a map of reports by equipment_id
        const reportsMap = new Map(reportsData?.map(r => [r.equipment_id, r]) || []);

        // Combine equipment with reports
        const combined: EquipmentWithReport[] = equipmentData?.map(eq => {
          const report = reportsMap.get(eq.id);
          return {
            id: eq.id,
            tag: eq.tag,
            name: eq.name,
            description: eq.description,
            system_name: eq.systems.name,
            area_name: eq.systems.areas.name,
            area_id: eq.systems.areas.id,
            report_id: report?.id || null,
            status: (report?.status as EquipmentStatus) || 'Satisfactorio',
            technical_description: report?.technical_description || null,
            sap_notification: report?.sap_notification || null,
            sap_order: report?.sap_order || null,
            planned_date: report?.planned_date || null,
            hasChanges: false,
          };
        }) || [];

        setEquipment(combined);
        setFilteredEquipment(combined);
      } catch (error) {
        console.error('Error fetching equipment:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los equipos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipment();
  }, [selectedWeek, selectedYear, toast]);

  // Filter equipment
  useEffect(() => {
    let filtered = [...equipment];
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(eq => 
        eq.tag.toLowerCase().includes(search) ||
        eq.name.toLowerCase().includes(search) ||
        eq.system_name.toLowerCase().includes(search)
      );
    }

    if (areaFilter !== "all") {
      filtered = filtered.filter(eq => eq.area_name === areaFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(eq => eq.status === statusFilter);
    }

    setFilteredEquipment(filtered);
  }, [searchTerm, areaFilter, statusFilter, equipment]);

  // Update equipment field
  const updateEquipmentField = (id: string, field: keyof EquipmentWithReport, value: string | null) => {
    setEquipment(prev => prev.map(eq => {
      if (eq.id === id) {
        return { ...eq, [field]: value, hasChanges: true };
      }
      return eq;
    }));
  };

  // Save changes
  const saveChanges = async () => {
    const changedEquipment = equipment.filter(eq => eq.hasChanges);
    
    if (changedEquipment.length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar",
      });
      return;
    }

    setIsSaving(true);
    try {
      const toInsert: Array<{
        equipment_id: string;
        week_number: number;
        year: number;
        status: EquipmentStatus;
        technical_description: string | null;
        sap_notification: string | null;
        sap_order: string | null;
        planned_date: string | null;
      }> = [];
      
      const toUpdate: Array<{
        id: string;
        status: EquipmentStatus;
        technical_description: string | null;
        sap_notification: string | null;
        sap_order: string | null;
        planned_date: string | null;
      }> = [];

      changedEquipment.forEach(eq => {
        if (eq.report_id) {
          toUpdate.push({
            id: eq.report_id,
            status: eq.status,
            technical_description: eq.technical_description,
            sap_notification: eq.sap_notification,
            sap_order: eq.sap_order,
            planned_date: eq.planned_date,
          });
        } else {
          toInsert.push({
            equipment_id: eq.id,
            week_number: selectedWeek,
            year: selectedYear,
            status: eq.status,
            technical_description: eq.technical_description,
            sap_notification: eq.sap_notification,
            sap_order: eq.sap_order,
            planned_date: eq.planned_date,
          });
        }
      });

      // Batch insert new reports
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('weekly_reports')
          .insert(toInsert);
        
        if (insertError) throw insertError;
      }

      // Update existing reports
      for (const report of toUpdate) {
        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update({
            status: report.status,
            technical_description: report.technical_description,
            sap_notification: report.sap_notification,
            sap_order: report.sap_order,
            planned_date: report.planned_date,
          })
          .eq('id', report.id);
        
        if (updateError) throw updateError;
      }

      // Clear hasChanges flags
      setEquipment(prev => prev.map(eq => ({ ...eq, hasChanges: false })));

      toast({
        title: "Guardado exitoso",
        description: `Se guardaron ${changedEquipment.length} registros`,
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const changesCount = equipment.filter(eq => eq.hasChanges).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registro Semanal</h1>
            <p className="text-muted-foreground mt-1">
              Ingrese el estado de los equipos para la semana seleccionada
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditor && changesCount > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                {changesCount} cambio{changesCount > 1 ? 's' : ''} pendiente{changesCount > 1 ? 's' : ''}
              </Badge>
            )}
            {isEditor ? (
              <Button
                onClick={saveChanges}
                disabled={isSaving || changesCount === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs">Modo lectura — ingresa a un perfil para editar</Badge>
            )}
          </div>
        </div>

        {/* Week Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Semana de Registro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <WeekSelector
                week={selectedWeek}
                year={selectedYear}
                onWeekChange={setSelectedWeek}
                onYearChange={setSelectedYear}
              />
              <div className="text-sm text-muted-foreground">
                {weekRange.start} - {weekRange.end}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por tag, nombre o sistema..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Tag</TableHead>
                      <TableHead className="w-48">Equipo</TableHead>
                      <TableHead className="w-32">Sistema</TableHead>
                      <TableHead className="w-36">Estado</TableHead>
                      <TableHead className="w-64">Condición Técnica</TableHead>
                      <TableHead className="w-32">Aviso SAP</TableHead>
                      <TableHead className="w-32">Orden SAP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron equipos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipment.map((eq) => (
                        <TableRow 
                          key={eq.id} 
                          className={eq.hasChanges ? "bg-amber-500/5" : ""}
                        >
                          <TableCell className="font-mono text-sm">{eq.tag}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{eq.name}</span>
                              <span className="text-xs text-muted-foreground">{eq.area_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{eq.system_name}</TableCell>
                          <TableCell>
                            <Select 
                              value={eq.status} 
                              onValueChange={(value) => updateEquipmentField(eq.id, 'status', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue>
                                  <Badge className={`${statusConfig[eq.status].color} border gap-1`}>
                                    {statusConfig[eq.status].icon}
                                    {statusConfig[eq.status].label}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      {config.icon}
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={eq.technical_description || ""}
                              onChange={(e) => updateEquipmentField(eq.id, 'technical_description', e.target.value || null)}
                              placeholder="Descripción técnica..."
                              className="min-h-[60px] text-sm resize-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={eq.sap_notification || ""}
                              onChange={(e) => updateEquipmentField(eq.id, 'sap_notification', e.target.value || null)}
                              placeholder="Aviso"
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={eq.sap_order || ""}
                              onChange={(e) => updateEquipmentField(eq.id, 'sap_order', e.target.value || null)}
                              placeholder="Orden"
                              className="h-8 text-sm"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredEquipment.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Mostrando {filteredEquipment.length} de {equipment.length} equipos
          </div>
        )}
      </div>
    </MainLayout>
  );
}
