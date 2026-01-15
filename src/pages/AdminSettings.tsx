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
}

interface UploadResult {
  success: number;
  errors: string[];
}

export default function AdminSettings() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
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

        // Insert equipment
        const { error: insertError } = await supabase
          .from('equipment')
          .insert({
            tag: tag,
            name: description || tag,
            description: description,
            system_id: systemId,
            criticality: 'Media'
          });

        if (insertError) {
          if (insertError.message.includes('duplicate')) {
            errors.push(`Equipo duplicado: ${tag}`);
          } else {
            errors.push(`Error insertando ${tag}: ${insertError.message}`);
          }
        } else {
          successCount++;
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
              Sube un archivo CSV con las columnas: Area, Sistema, Tag, Descripcion_Equipo
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
