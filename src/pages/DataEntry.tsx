import { MainLayout } from "@/components/layout/MainLayout";
import { ClipboardEdit } from "lucide-react";

export default function DataEntry() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro Semanal</h1>
          <p className="text-muted-foreground mt-1">
            Ingrese el estado de los equipos para la semana seleccionada
          </p>
        </div>
        <div className="industrial-panel p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <ClipboardEdit className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            La funcionalidad de registro semanal estará disponible pronto. 
            Podrá ingresar estados, notificaciones SAP y descripciones técnicas.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
