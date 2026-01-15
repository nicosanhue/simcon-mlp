import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileImage, Loader2 } from "lucide-react";
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

interface AreaReport {
  area_name: string;
  equipment: CriticalEquipment[];
}

export function CriticalReportDownload() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchCriticalData = async (): Promise<AreaReport[]> => {
    // Fetch ALL critical equipment (Falla or Alerta) from entire history
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

    // Group by area
    const areaMap = new Map<string, CriticalEquipment[]>();

    data?.forEach((report: any) => {
      const equipment = report.equipment;
      if (!equipment) return;

      const areaName = equipment.system?.area?.name || 'Sin Área';
      const systemName = equipment.system?.name || 'Sin Sistema';

      const criticalEquip: CriticalEquipment = {
        tag: equipment.tag,
        name: equipment.name,
        status: report.status,
        technical_description: report.technical_description,
        sap_notification: report.sap_notification,
        sap_order: report.sap_order,
        planned_date: report.planned_date,
        area_name: areaName,
        system_name: systemName,
        week_number: report.week_number,
        year: report.year,
      };

      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, []);
      }
      areaMap.get(areaName)!.push(criticalEquip);
    });

    return Array.from(areaMap.entries()).map(([area_name, equipment]) => ({
      area_name,
      equipment,
    }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const areaReports = await fetchCriticalData();

      if (areaReports.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay condiciones críticas registradas en el historial",
        });
        setIsGenerating(false);
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Reporte de Condiciones Críticas", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Date
      const now = new Date();
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generado: ${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL')}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Process each area
      for (const areaReport of areaReports) {
        // Check if we need a new page
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        // Area header
        pdf.setFillColor(220, 53, 69); // Red background
        pdf.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Área: ${areaReport.area_name}`, margin + 5, yPos + 2);
        pdf.setTextColor(0, 0, 0);
        yPos += 15;

        // Equipment list
        for (const equip of areaReport.equipment) {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          // Status badge
          const statusColor = equip.status === 'Falla' ? [220, 53, 69] : [255, 193, 7];
          pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          pdf.roundedRect(margin, yPos - 4, 20, 7, 1, 1, 'F');
          pdf.setTextColor(equip.status === 'Falla' ? 255 : 0, equip.status === 'Falla' ? 255 : 0, equip.status === 'Falla' ? 255 : 0);
          pdf.setFontSize(8);
          pdf.text(equip.status, margin + 10, yPos, { align: "center" });
          pdf.setTextColor(0, 0, 0);

          // Tag and name with week/year
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${equip.tag} - ${equip.name}`, margin + 25, yPos);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`S${equip.week_number}/${equip.year}`, pageWidth - margin - 20, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 6;

          // System
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Sistema: ${equip.system_name}`, margin + 5, yPos);
          yPos += 5;

          // Technical description
          if (equip.technical_description) {
            pdf.setTextColor(0, 0, 0);
            const descLines = pdf.splitTextToSize(equip.technical_description, pageWidth - margin * 2 - 10);
            pdf.text(descLines, margin + 5, yPos);
            yPos += descLines.length * 4 + 2;
          }

          // SAP info
          if (equip.sap_notification || equip.sap_order) {
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            const sapInfo = [];
            if (equip.sap_notification) sapInfo.push(`Aviso: ${equip.sap_notification}`);
            if (equip.sap_order) sapInfo.push(`Orden: ${equip.sap_order}`);
            pdf.text(sapInfo.join('  |  '), margin + 5, yPos);
            yPos += 4;
          }

          // Planned date
          if (equip.planned_date) {
            pdf.setTextColor(0, 100, 0);
            pdf.text(`Fecha planificada: ${new Date(equip.planned_date).toLocaleDateString('es-CL')}`, margin + 5, yPos);
            yPos += 4;
          }

          pdf.setTextColor(0, 0, 0);
          yPos += 8;
        }

        yPos += 5;
      }

      // Summary footer
      const totalCritical = areaReports.reduce((acc, ar) => acc + ar.equipment.length, 0);
      const totalFallas = areaReports.reduce((acc, ar) => acc + ar.equipment.filter(e => e.status === 'Falla').length, 0);
      const totalAlertas = areaReports.reduce((acc, ar) => acc + ar.equipment.filter(e => e.status === 'Alerta').length, 0);

      if (yPos > 260) {
        pdf.addPage();
        yPos = 20;
      }

      yPos += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Resumen: ${totalCritical} equipos críticos (${totalFallas} Fallas, ${totalAlertas} Alertas)`, margin, yPos);

      // Save PDF
      const fileName = `reporte_criticos_${now.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF generado",
        description: `Archivo ${fileName} descargado`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Error al generar el reporte PDF",
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
