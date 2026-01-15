import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EquipmentHistorySearch } from "@/components/history/EquipmentHistorySearch";
import { EquipmentTimeline } from "@/components/history/EquipmentTimeline";
import { useEquipmentHistory } from "@/hooks/useEquipmentHistory";
import { History as HistoryIcon, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const { data: equipment, isLoading, error } = useEquipmentHistory(selectedEquipmentId);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial</h1>
          <p className="text-muted-foreground mt-1">
            Consulte el historial de condición de cada equipo
          </p>
        </div>

        {/* Search */}
        <EquipmentHistorySearch
          onSelectEquipment={setSelectedEquipmentId}
          selectedEquipmentId={selectedEquipmentId}
        />

        {/* Content */}
        {!selectedEquipmentId ? (
          <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Buscar Equipo</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Ingrese el TAG o nombre de un equipo en el buscador para ver su historial de condición.
            </p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-destructive/10 mb-4">
              <HistoryIcon className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Error</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              No se pudo cargar el historial del equipo. Por favor, intente nuevamente.
            </p>
          </div>
        ) : equipment ? (
          <EquipmentTimeline equipment={equipment} />
        ) : (
          <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
              <HistoryIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Equipo no encontrado</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              El equipo seleccionado no existe o fue eliminado.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
