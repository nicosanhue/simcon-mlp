import { MainLayout } from "@/components/layout/MainLayout";
import { Settings2 } from "lucide-react";

export default function Assets() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activos</h1>
          <p className="text-muted-foreground mt-1">
            Gestione áreas, sistemas y equipos
          </p>
        </div>
        <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <Settings2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            La gestión de activos estará disponible pronto. 
            Podrá administrar áreas, sistemas y equipos del sistema.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
