import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export function ReadOnlyLock({ page }: { page: string }) {
  return (
    <Card className="p-10 text-center max-w-xl mx-auto mt-8">
      <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h2 className="font-semibold text-lg mb-1">{page} · Modo lectura</h2>
      <p className="text-sm text-muted-foreground">
        Para modificar datos en esta sección debes ingresar a un perfil (MonCon o AdC)
        desde el menú lateral izquierdo.
      </p>
    </Card>
  );
}
