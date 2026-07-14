import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Props {
  week: number;
  year: number;
}

export function ConditionsExcelDownload({ week, year }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select(`
          status,
          week_number,
          year,
          technical_description,
          sap_notification,
          sap_order,
          planned_date,
          created_at,
          updated_at,
          equipment:equipment_id (
            tag,
            name,
            criticality,
            system:system_id (
              name,
              area:area_id ( name )
            )
          )
        `)
        .in("status", ["Crítico", "Alerta", "Seguimiento"])
        .eq("week_number", week)
        .eq("year", year);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sin datos",
          description: `No hay equipos en Crítico / Alerta / Seguimiento para semana ${week}/${year}`,
        });
        return;
      }

      const order = { "Crítico": 0, "Alerta": 1, "Seguimiento": 2 } as Record<string, number>;
      const rows = data
        .map((r: any) => ({
          Estado: r.status,
          Área: r.equipment?.system?.area?.name ?? "",
          Sistema: r.equipment?.system?.name ?? "",
          Tag: r.equipment?.tag ?? "",
          Equipo: r.equipment?.name ?? "",
          Criticidad: r.equipment?.criticality ?? "",
          Semana: r.week_number,
          Año: r.year,
          "Descripción técnica": r.technical_description ?? "",
          "Aviso SAP": r.sap_notification ?? "",
          "Orden SAP": r.sap_order ?? "",
          "Fecha planificada": r.planned_date ?? "",
          "Creado": r.created_at ? new Date(r.created_at).toLocaleString("es-CL") : "",
          "Actualizado": r.updated_at ? new Date(r.updated_at).toLocaleString("es-CL") : "",
        }))
        .sort((a, b) => {
          const s = (order[a.Estado] ?? 99) - (order[b.Estado] ?? 99);
          if (s !== 0) return s;
          return (a.Área + a.Sistema + a.Tag).localeCompare(b.Área + b.Sistema + b.Tag);
        });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 32 },
        { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 50 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `S${week}-${year}`);

      const fileName = `condiciones_S${week}_${year}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({ title: "Excel generado", description: fileName });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isGenerating} className="gap-2">
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      <span className="hidden sm:inline">Descargar Excel Condiciones</span>
    </Button>
  );
}
