import { MainLayout } from "@/components/layout/MainLayout";
import { History as HistoryIcon } from "lucide-react";

export default function History() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial</h1>
          <p className="text-muted-foreground mt-1">
            Consulte el historial de condición de cada equipo
          </p>
        </div>
        <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <HistoryIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            La funcionalidad de historial estará disponible pronto. 
            Podrá buscar equipos por TAG y ver su evolución temporal.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
