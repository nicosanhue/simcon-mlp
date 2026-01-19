import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface Area {
  id: string;
  name: string;
}

interface DashboardScreenshotDownloadProps {
  areas: Area[];
  currentWeek: number;
  currentYear: number;
  onAreaChange: (areaId: string) => void;
  dashboardRef: React.RefObject<HTMLDivElement | null>;
}

export function DashboardScreenshotDownload({
  areas,
  currentWeek,
  currentYear,
  onAreaChange,
  dashboardRef,
}: DashboardScreenshotDownloadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturingArea, setCapturingArea] = useState<string | null>(null);
  const { toast } = useToast();

  const captureScreenshot = async (area: Area) => {
    if (!dashboardRef.current) {
      toast({
        title: "Error",
        description: "No se pudo capturar el dashboard",
        variant: "destructive",
      });
      return;
    }

    setIsCapturing(true);
    setCapturingArea(area.id);

    try {
      // Change area filter first
      onAreaChange(area.id);

      // Wait for the UI to update
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Capture the dashboard
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `dashboard_${area.name.replace(/\s+/g, "_")}_S${currentWeek}_${currentYear}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: "Captura descargada",
            description: `Dashboard de ${area.name}`,
          });
        }
      }, "image/png");
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      toast({
        title: "Error",
        description: "Error al capturar el dashboard",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
      setCapturingArea(null);
    }
  };

  const captureAllAreas = async () => {
    if (!dashboardRef.current || areas.length === 0) {
      toast({
        title: "Error",
        description: "No hay áreas disponibles para capturar",
        variant: "destructive",
      });
      return;
    }

    setIsCapturing(true);

    try {
      for (const area of areas) {
        setCapturingArea(area.id);
        
        // Change area filter
        onAreaChange(area.id);

        // Wait for the UI to update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Capture the dashboard
        const canvas = await html2canvas(dashboardRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
        });

        // Convert to blob and download
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `dashboard_${area.name.replace(/\s+/g, "_")}_S${currentWeek}_${currentYear}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
            resolve();
          }, "image/png");
        });

        // Small delay between captures
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast({
        title: "Capturas descargadas",
        description: `${areas.length} dashboards por área`,
      });
    } catch (error) {
      console.error("Error capturing screenshots:", error);
      toast({
        title: "Error",
        description: "Error al capturar los dashboards",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
      setCapturingArea(null);
      // Reset to "all areas" view
      onAreaChange("all");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isCapturing}
          className="gap-2"
        >
          {isCapturing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isCapturing && capturingArea
              ? `Capturando...`
              : "Captura por Área"}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={captureAllAreas}
          disabled={isCapturing}
          className="font-medium"
        >
          <Camera className="h-4 w-4 mr-2" />
          Descargar todas las áreas
        </DropdownMenuItem>
        <div className="h-px bg-border my-1" />
        {areas.map((area) => (
          <DropdownMenuItem
            key={area.id}
            onClick={() => captureScreenshot(area)}
            disabled={isCapturing}
          >
            {capturingArea === area.id ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2 opacity-50" />
            )}
            {area.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
