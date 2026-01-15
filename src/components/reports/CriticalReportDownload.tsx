import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface CriticalEquipment {
  tag: string;
  name: string;
  status: string;
  technical_description: string | null;
  sap_notification: string | null;
  sap_order: string | null;
  planned_date: string | null;
  area_name: string;
  system_name: string;
  week_number: number;
  year: number;
}

export function CriticalReportDownload() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchCriticalData = async (): Promise<{ fallas: CriticalEquipment[]; alertas: CriticalEquipment[] }> => {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select(`
        status,
        technical_description,
        sap_notification,
        sap_order,
        planned_date,
        week_number,
        year,
        equipment:equipment_id (
          tag,
          name,
          system:system_id (
            name,
            area:area_id (
              name
            )
          )
        )
      `)
      .in('status', ['Falla', 'Alerta'])
      .order('year', { ascending: false })
      .order('week_number', { ascending: false });

    if (error) throw error;

    const fallas: CriticalEquipment[] = [];
    const alertas: CriticalEquipment[] = [];

    data?.forEach((report: any) => {
      const equipment = report.equipment;
      if (!equipment) return;

      const criticalEquip: CriticalEquipment = {
        tag: equipment.tag,
        name: equipment.name,
        status: report.status,
        technical_description: report.technical_description,
        sap_notification: report.sap_notification,
        sap_order: report.sap_order,
        planned_date: report.planned_date,
        area_name: equipment.system?.area?.name || 'Sin Área',
        system_name: equipment.system?.name || 'Sin Sistema',
        week_number: report.week_number,
        year: report.year,
      };

      if (report.status === 'Falla') {
        fallas.push(criticalEquip);
      } else {
        alertas.push(criticalEquip);
      }
    });

    return { fallas, alertas };
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const { fallas, alertas } = await fetchCriticalData();

      if (fallas.length === 0 && alertas.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay condiciones críticas registradas",
        });
        setIsGenerating(false);
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 25;

      // Title - minimal
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text("Condiciones Críticas", margin, yPos);
      
      // Date - right aligned
      const now = new Date();
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(now.toLocaleDateString('es-CL'), pageWidth - margin, yPos, { align: "right" });
      
      yPos += 12;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Render equipment list
      const renderEquipmentList = (items: CriticalEquipment[], sectionTitle: string, color: number[]) => {
        if (items.length === 0) return;

        // Section header
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(`${sectionTitle} (${items.length})`, margin, yPos);
        yPos += 8;

        items.forEach((equip) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 25;
          }

          // Tag + Name
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(40, 40, 40);
          pdf.text(`${equip.tag}`, margin, yPos);
          
          pdf.setFont("helvetica", "normal");
          pdf.text(`— ${equip.name}`, margin + pdf.getTextWidth(equip.tag) + 2, yPos);

          // Week/Year right aligned
          pdf.setFontSize(8);
          pdf.setTextColor(140, 140, 140);
          pdf.text(`S${equip.week_number}/${equip.year}`, pageWidth - margin, yPos, { align: "right" });
          yPos += 5;

          // Area > System
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`${equip.area_name} › ${equip.system_name}`, margin, yPos);
          yPos += 4;

          // Technical description (if exists)
          if (equip.technical_description) {
            pdf.setTextColor(60, 60, 60);
            const desc = equip.technical_description.length > 100 
              ? equip.technical_description.substring(0, 100) + '...' 
              : equip.technical_description;
            pdf.text(desc, margin, yPos);
            yPos += 4;
          }

          // SAP info inline
          if (equip.sap_notification || equip.sap_order) {
            pdf.setTextColor(100, 100, 100);
            const sapParts = [];
            if (equip.sap_notification) sapParts.push(`Aviso: ${equip.sap_notification}`);
            if (equip.sap_order) sapParts.push(`Orden: ${equip.sap_order}`);
            pdf.text(sapParts.join('  •  '), margin, yPos);
            yPos += 4;
          }

          yPos += 4; // spacing between items
        });

        yPos += 6; // spacing after section
      };

      // Render Fallas first (red)
      renderEquipmentList(fallas, "En Falla", [180, 40, 40]);

      // Render Alertas second (amber)
      renderEquipmentList(alertas, "En Alerta", [180, 120, 20]);

      // Footer summary
      if (yPos > 270) {
        pdf.addPage();
        yPos = 25;
      }
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Total: ${fallas.length + alertas.length} registros`, margin, yPos);

      // Save
      const fileName = `criticos_${now.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF generado",
        description: fileName,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Error al generar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Descargar Críticos</span>
    </Button>
  );
}
