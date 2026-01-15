import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CSVRow {
  Area: string;
  Sistema: string;
  Tag: string;
  Descripcion_Equipo: string;
  Estado: string;
  Condicion_Tecnica: string;
  Aviso_SAP: string;
  Orden_SAP: string;
  Fecha_Plan: string;
  Semana: string;
  Anio: string;
}

interface UploadResult {
  success: number;
  errors: string[];
}

// Map CSV status values to database enum values
const mapStatus = (csvStatus: string): 'Operativo' | 'Stand By' | 'Falla' | 'Alerta' => {
  const statusLower = csvStatus?.toLowerCase().trim();
  if (statusLower === 'critico' || statusLower === 'crítico') return 'Falla';
  if (statusLower === 'alerta') return 'Alerta';
  if (statusLower === 'stand by' || statusLower === 'standby') return 'Stand By';
  return 'Operativo'; // Default
};

export default function AdminSettings() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      // Handle quoted values with commas inside
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/"/g, '') || '';
      });
      return row as unknown as CSVRow;
    }).filter(row => row.Tag && row.Tag.trim() !== '');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      // Fetch all areas and systems for lookup
      const { data: areas, error: areasError } = await supabase
        .from('areas')
        .select('id, name');
      
      if (areasError) throw areasError;

      const { data: systems, error: systemsError } = await supabase
        .from('systems')
        .select('id, name, area_id');
      
      if (systemsError) throw systemsError;

      // Create lookup maps
      const areaMap = new Map(areas?.map(a => [a.name.toLowerCase().trim(), a.id]) || []);
      const systemMap = new Map(systems?.map(s => [
        `${s.area_id}-${s.name.toLowerCase().trim()}`, 
        s.id
      ]) || []);

      const errors: string[] = [];
      let successCount = 0;

      // Process each row
      for (const row of rows) {
        const areaName = row.Area?.trim().toLowerCase();
        const systemName = row.Sistema?.trim().toLowerCase();
        const tag = row.Tag?.trim();
        const description = row.Descripcion_Equipo?.trim();

        if (!areaName || !systemName || !tag) {
          errors.push(`Fila inválida: ${tag || 'sin tag'} - faltan datos requeridos`);
          continue;
        }

        // Find area ID
        const areaId = areaMap.get(areaName);
        if (!areaId) {
          errors.push(`Área no encontrada: "${row.Area}" para equipo ${tag}`);
          continue;
        }

        // Find system ID
        const systemKey = `${areaId}-${systemName}`;
        const systemId = systemMap.get(systemKey);
        if (!systemId) {
          errors.push(`Sistema no encontrado: "${row.Sistema}" en área "${row.Area}" para equipo ${tag}`);
          continue;
        }

        // Check if equipment exists, if not insert it
        let equipmentId: string;
        const { data: existingEquipment } = await supabase
          .from('equipment')
          .select('id')
          .eq('tag', tag)
          .single();

        if (existingEquipment) {
          equipmentId = existingEquipment.id;
        } else {
          // Insert new equipment
          const { data: newEquipment, error: insertError } = await supabase
            .from('equipment')
            .insert({
              tag: tag,
              name: description || tag,
              description: description,
              system_id: systemId,
              criticality: 'Media'
            })
            .select('id')
            .single();

          if (insertError) {
            errors.push(`Error insertando equipo ${tag}: ${insertError.message}`);
            continue;
          }
          equipmentId = newEquipment.id;
        }

        // Parse week and year
        const weekNumber = parseInt(row.Semana) || null;
        const year = parseInt(row.Anio) || null;

        // Only create weekly report if we have week and year
        if (weekNumber && year) {
          // Parse planned date
          let plannedDate: string | null = null;
          if (row.Fecha_Plan) {
            const dateParts = row.Fecha_Plan.split('/');
            if (dateParts.length === 3) {
              // Assuming DD/MM/YYYY format
              plannedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
          }

          // Map status
          const status = mapStatus(row.Estado);

          // Check if report already exists for this equipment/week/year
          const { data: existingReport } = await supabase
            .from('weekly_reports')
            .select('id')
            .eq('equipment_id', equipmentId)
            .eq('week_number', weekNumber)
            .eq('year', year)
            .single();

          if (existingReport) {
            // Update existing report
            const { error: updateError } = await supabase
              .from('weekly_reports')
              .update({
                status: status,
                technical_description: row.Condicion_Tecnica || null,
                sap_notification: row.Aviso_SAP || null,
                sap_order: row.Orden_SAP || null,
                planned_date: plannedDate
              })
              .eq('id', existingReport.id);

            if (updateError) {
              errors.push(`Error actualizando reporte ${tag} S${weekNumber}: ${updateError.message}`);
            } else {
              successCount++;
            }
          } else {
            // Insert new weekly report
            const { error: reportError } = await supabase
              .from('weekly_reports')
              .insert({
                equipment_id: equipmentId,
                week_number: weekNumber,
                year: year,
                status: status,
                technical_description: row.Condicion_Tecnica || null,
                sap_notification: row.Aviso_SAP || null,
                sap_order: row.Orden_SAP || null,
                planned_date: plannedDate
              });

            if (reportError) {
              errors.push(`Error insertando reporte ${tag} S${weekNumber}: ${reportError.message}`);
            } else {
              successCount++;
            }
          }
        } else {
          successCount++; // Count equipment insertion as success if no report data
        }
      }

      setResult({ success: successCount, errors });
      
      if (successCount > 0) {
        toast({
          title: "Carga completada",
          description: `${successCount} equipos insertados correctamente`,
        });
      }

    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: "Error",
        description: "Error procesando el archivo CSV",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración Admin</h1>
          <p className="text-muted-foreground">Herramientas de administración del sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Cargar Equipos desde CSV
            </CardTitle>
            <CardDescription>
              Sube un archivo CSV con las columnas: Area, Sistema, Tag, Descripcion_Equipo, Estado, Condicion_Tecnica, Aviso_SAP, Orden_SAP, Fecha_Plan, Semana, Anio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="max-w-sm"
              />
              {isUploading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Upload className="h-4 w-4 animate-pulse" />
                  <span>Procesando...</span>
                </div>
              )}
            </div>

            {result && (
              <div className="space-y-3 mt-4">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{result.success} equipos insertados correctamente</span>
                  </div>
                )}
                
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{result.errors.length} errores encontrados:</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto bg-muted p-3 rounded-md text-sm">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-muted-foreground">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
