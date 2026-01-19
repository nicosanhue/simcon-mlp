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

// Parse week and year from filename like "Estado Equipos Semana 52 2025.csv"
const parseFilename = (filename: string): { week: number; year: number } | null => {
  // Match pattern: "Estado Equipos Semana [Week] [Year].csv"
  const match = filename.match(/Estado\s+Equipos\s+Semana\s+(\d+)\s+(\d{4})\.csv/i);
  if (match) {
    return { week: parseInt(match[1]), year: parseInt(match[2]) };
  }
  return null;
};

// Map area names (legacy support)
const mapAreaName = (areaName: string): string => {
  const normalized = areaName.toLowerCase().trim();
  if (normalized === 'puerto desaladora') {
    return 'puerto';
  }
  return areaName.trim();
};

export default function AdminSettings() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [parsedFileInfo, setParsedFileInfo] = useState<{ week: number; year: number } | null>(null);
  const { toast } = useToast();

  // Force semicolon delimiter (Spanish Excel format)
  const DELIMITER = ';';

  const parseCSV = (text: string): CSVRow[] => {
    // Remove BOM character if present and normalize line endings
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const lines = cleanText.split('\n');
    
    if (lines.length === 0) return [];
    
    // Use forced semicolon delimiter
    const delimiter = DELIMITER;
    console.log(`CSV parsing with forced delimiter: "${delimiter}", total lines: ${lines.length}`);
    
    // Parse headers and filter out empty ones
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, '')).filter(h => h !== '');
    console.log('CSV headers:', headers);
    
    // Expected headers for validation
    const expectedHeaders = ['Area', 'Sistema', 'Tag', 'Descripcion_Equipo', 'Estado', 'Condicion_Tecnica', 'Aviso_SAP', 'Orden_SAP', 'Fecha_Plan'];
    
    return lines.slice(1).map((line, lineIndex) => {
      // Skip empty lines
      if (!line.trim()) return null;
      
      // Handle quoted values with delimiter inside
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      // Push the last value
      values.push(current.trim());
      
      // Build row object, handling missing values safely
      const row: Record<string, string> = {};
      expectedHeaders.forEach((header, index) => {
        // Use header from file if available, otherwise use expected header
        const actualHeader = headers[index] || header;
        let value = values[index];
        // Handle undefined, null, and clean quotes
        value = (value !== undefined && value !== null) 
          ? value.replace(/"/g, '').trim() 
          : '';
        
        // Apply area name mapping
        if (header === 'Area') {
          value = mapAreaName(value);
        }
        
        row[actualHeader] = value;
      });
      
      return row as unknown as CSVRow;
    }).filter((row): row is CSVRow => row !== null && row.Tag && row.Tag.trim() !== '');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    setParsedFileInfo(null);

    // Parse week and year from filename
    const fileInfo = parseFilename(file.name);
    if (!fileInfo) {
      toast({
        title: "Error de formato",
        description: "El nombre del archivo debe seguir el formato: 'Estado Equipos Semana [Semana] [Año].csv' (ej: 'Estado Equipos Semana 52 2025.csv')",
        variant: "destructive",
      });
      setIsUploading(false);
      event.target.value = '';
      return;
    }

    setParsedFileInfo(fileInfo);
    const { week: weekNumber, year } = fileInfo;
    console.log(`Parsed from filename: Week ${weekNumber}, Year ${year}`);

    try {
      // Force UTF-8 encoding to handle special characters like 'ñ'
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });
      
      const rows = parseCSV(text);
      console.log(`Parsed ${rows.length} rows from CSV (UTF-8 encoding)`);

      // DELETE existing records for this week/year (clean overwrite)
      console.log(`Deleting existing records for Week ${weekNumber}, Year ${year}...`);
      const { error: deleteError, count: deletedCount } = await supabase
        .from('weekly_reports')
        .delete()
        .eq('week_number', weekNumber)
        .eq('year', year);
      
      if (deleteError) {
        console.error('Error deleting existing records:', deleteError);
        throw deleteError;
      }
      console.log(`Deleted ${deletedCount ?? 'unknown number of'} existing records`);

      // Fetch all areas, systems, and equipment for lookup
      const [areasRes, systemsRes, equipmentRes] = await Promise.all([
        supabase.from('areas').select('id, name'),
        supabase.from('systems').select('id, name, area_id'),
        supabase.from('equipment').select('id, tag, system_id')
      ]);
      
      if (areasRes.error) throw areasRes.error;
      if (systemsRes.error) throw systemsRes.error;
      if (equipmentRes.error) throw equipmentRes.error;

      // Create lookup maps
      const areaMap = new Map(areasRes.data?.map(a => [a.name.toLowerCase().trim(), a.id]) || []);
      const systemMap = new Map(systemsRes.data?.map(s => [
        `${s.area_id}-${s.name.toLowerCase().trim()}`, 
        s.id
      ]) || []);
      const equipmentMap = new Map(equipmentRes.data?.map(e => [e.tag, e.id]) || []);

      const errors: string[] = [];
      const newEquipmentToInsert: Array<{
        tag: string;
        name: string;
        description: string | null;
        system_id: string;
        criticality: 'Alta' | 'Media' | 'Baja';
      }> = [];
      const rowsToProcess: Array<{
        row: CSVRow;
        systemId: string;
      }> = [];

      // First pass: validate and collect new equipment
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

        // Find system ID, or create if not exists
        const systemKey = `${areaId}-${systemName}`;
        let systemId = systemMap.get(systemKey);
        
        if (!systemId) {
          // Try to create the system
          const { data: newSystem, error: createSystemError } = await supabase
            .from('systems')
            .insert({
              name: row.Sistema?.trim(),
              area_id: areaId,
              description: null
            })
            .select('id')
            .single();

          if (createSystemError) {
            errors.push(`Sistema no encontrado y no se pudo crear: "${row.Sistema}" en área "${row.Area}" para equipo ${tag}`);
            continue;
          }
          
          systemId = newSystem.id;
          systemMap.set(systemKey, systemId);
          console.log(`Created new system: ${row.Sistema} with id ${systemId}`);
        }

        // Check if equipment already exists
        if (!equipmentMap.has(tag)) {
          newEquipmentToInsert.push({
            tag: tag,
            name: description || tag,
            description: description || null,
            system_id: systemId,
            criticality: 'Media'
          });
        }

        rowsToProcess.push({ row, systemId });
      }

      // Batch insert new equipment (in chunks of 100)
      const BATCH_SIZE = 100;
      for (let i = 0; i < newEquipmentToInsert.length; i += BATCH_SIZE) {
        const batch = newEquipmentToInsert.slice(i, i + BATCH_SIZE);
        const { data: insertedEquipment, error: insertError } = await supabase
          .from('equipment')
          .insert(batch)
          .select('id, tag');

        if (insertError) {
          errors.push(`Error insertando lote de equipos: ${insertError.message}`);
        } else if (insertedEquipment) {
          // Update the equipment map with new IDs
          insertedEquipment.forEach(e => equipmentMap.set(e.tag, e.id));
        }
      }

      console.log(`Equipment map now has ${equipmentMap.size} entries`);

      // Prepare reports for insert (all new since we deleted existing)
      const reportsToInsert: Array<{
        equipment_id: string;
        week_number: number;
        year: number;
        status: 'Operativo' | 'Stand By' | 'Falla' | 'Alerta';
        technical_description: string | null;
        sap_notification: string | null;
        sap_order: string | null;
        planned_date: string | null;
      }> = [];

      let successCount = 0;

      for (const { row } of rowsToProcess) {
        const tag = row.Tag?.trim();
        const equipmentId = equipmentMap.get(tag);
        
        if (!equipmentId) {
          errors.push(`Equipo no encontrado después de inserción: ${tag}`);
          continue;
        }

        // Parse planned date
        let plannedDate: string | null = null;
        if (row.Fecha_Plan) {
          const dateParts = row.Fecha_Plan.split('/');
          if (dateParts.length === 3) {
            plannedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          }
        }

        const status = mapStatus(row.Estado);

        reportsToInsert.push({
          equipment_id: equipmentId,
          week_number: weekNumber,
          year: year,
          status,
          technical_description: row.Condicion_Tecnica || null,
          sap_notification: row.Aviso_SAP || null,
          sap_order: row.Orden_SAP || null,
          planned_date: plannedDate
        });
      }

      console.log(`Inserting ${reportsToInsert.length} new reports for Week ${weekNumber}, Year ${year}`);

      // Batch insert new reports
      for (let i = 0; i < reportsToInsert.length; i += BATCH_SIZE) {
        const batch = reportsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('weekly_reports')
          .insert(batch);

        if (insertError) {
          errors.push(`Error insertando lote de reportes: ${insertError.message}`);
        } else {
          successCount += batch.length;
        }
      }

      setResult({ success: successCount, errors });
      
      if (successCount > 0) {
        toast({
          title: "Carga completada",
          description: `${successCount} registros procesados correctamente`,
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
              Cargar Datos Semanales desde CSV
            </CardTitle>
            <CardDescription>
              <strong>Formato de nombre de archivo:</strong> Estado Equipos Semana [Semana] [Año].csv<br />
              <span className="text-xs">Ejemplo: "Estado Equipos Semana 52 2025.csv"</span><br /><br />
              <strong>Columnas requeridas:</strong> Area, Sistema, Tag, Descripcion_Equipo, Estado, Condicion_Tecnica, Aviso_SAP, Orden_SAP, Fecha_Plan<br />
              <span className="text-xs text-muted-foreground">La semana y año se extraen automáticamente del nombre del archivo. Los registros existentes para esa semana se reemplazan automáticamente.</span>
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

            {parsedFileInfo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Archivo detectado: <strong>Semana {parsedFileInfo.week}, Año {parsedFileInfo.year}</strong></span>
              </div>
            )}

            {result && (
              <div className="space-y-3 mt-4">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span>{result.success} registros procesados correctamente</span>
                  </div>
                )}
                
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
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
