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

  const fetchCriticalData = async (): Promise<{ fallas: CriticalEquipment[]; alertas: CriticalEquipment[]; latestWeek: number; latestYear: number }> => {
    // First, get the latest week with data
    const { data: latestData, error: latestError } = await supabase
      .from('weekly_reports')
      .select('week_number, year')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestData) {
      return { fallas: [], alertas: [], latestWeek: 0, latestYear: 0 };
    }

    const latestWeek = latestData.week_number;
    const latestYear = latestData.year;

    // Now fetch only critical data from the latest week
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
      .in('status', ['Crítico', 'Alerta'])
      .eq('week_number', latestWeek)
      .eq('year', latestYear);

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

    return { fallas, alertas, latestWeek, latestYear };
  };

  // Load logo as base64 for PDF
  const loadLogoAsBase64 = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = '/images/logo-pelambres.png';
    });
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const { fallas, alertas, latestWeek, latestYear } = await fetchCriticalData();

      if (fallas.length === 0 && alertas.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay condiciones críticas en la última semana",
        });
        setIsGenerating(false);
        return;
      }

      // Load logo
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadLogoAsBase64();
      } catch (e) {
        console.warn('Could not load logo:', e);
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 10;

      // Header with green background
      pdf.setFillColor(0, 128, 77); // Corporate green
      pdf.rect(0, 0, pageWidth, 28, 'F');
      
      // Add logo if available
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', margin, 4, 50, 20);
      }
      
      // Title - right side
      const now = new Date();
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Reporte de Condiciones Críticas", pageWidth - margin, 12, { align: "right" });
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Semana ${latestWeek} / ${latestYear}`, pageWidth - margin, 20, { align: "right" });
      
      yPos = 38;

      // Group equipment by area
      const groupByArea = (items: CriticalEquipment[]): Map<string, CriticalEquipment[]> => {
        const areaMap = new Map<string, CriticalEquipment[]>();
        items.forEach(item => {
          if (!areaMap.has(item.area_name)) {
            areaMap.set(item.area_name, []);
          }
          areaMap.get(item.area_name)!.push(item);
        });
        return areaMap;
      };

      // Render equipment list with colored section headers, grouped by area
      const renderEquipmentList = (items: CriticalEquipment[], sectionTitle: string, bgColor: number[], textColor: number[]) => {
        if (items.length === 0) return;

        // Check page break
        if (yPos > 260) {
          pdf.addPage();
          yPos = 20;
        }

        // Main section header with colored background
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.text(`${sectionTitle} (${items.length})`, margin + 3, yPos + 2);
        yPos += 14;

        // Group by area
        const areaGroups = groupByArea(items);

        areaGroups.forEach((areaItems, areaName) => {
          // Check page break before area header
          if (yPos > 265) {
            pdf.addPage();
            yPos = 20;
          }

          // Area sub-header
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(60, 60, 60);
          pdf.text(`${areaName}`, margin, yPos);
          yPos += 6;

          // Render equipment in this area
          areaItems.forEach((equip) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }

            // Tag + Name
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(40, 40, 40);
            pdf.text(`${equip.tag}`, margin + 3, yPos);
            
            pdf.setFont("helvetica", "normal");
            pdf.text(`— ${equip.name}`, margin + 3 + pdf.getTextWidth(equip.tag) + 2, yPos);

            // Week/Year right aligned
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`S${equip.week_number}/${equip.year}`, pageWidth - margin, yPos, { align: "right" });
            yPos += 5;

            // System
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${equip.system_name}`, margin + 3, yPos);
            yPos += 4;

            // Technical description (if exists)
            if (equip.technical_description) {
              pdf.setTextColor(60, 60, 60);
              const desc = equip.technical_description.length > 120 
                ? equip.technical_description.substring(0, 120) + '...' 
                : equip.technical_description;
              pdf.text(desc, margin + 3, yPos);
              yPos += 4;
            }

            // SAP info inline
            if (equip.sap_notification || equip.sap_order) {
              pdf.setTextColor(100, 100, 100);
              const sapParts = [];
              if (equip.sap_notification) sapParts.push(`Aviso: ${equip.sap_notification}`);
              if (equip.sap_order) sapParts.push(`Orden: ${equip.sap_order}`);
              pdf.text(sapParts.join('  •  '), margin + 3, yPos);
              yPos += 4;
            }

            yPos += 2; // spacing between items
          });

          yPos += 4; // spacing after area
        });

        yPos += 6; // spacing after section
      };

      // Render Fallas first (red background, white text)
      renderEquipmentList(fallas, "EN FALLA", [220, 53, 69], [255, 255, 255]);

      // Render Alertas second (yellow/amber background, dark text)
      renderEquipmentList(alertas, "EN ALERTA", [255, 193, 7], [40, 40, 40]);

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
