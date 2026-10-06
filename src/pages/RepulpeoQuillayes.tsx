import { ExternalLink, Gauge, AppWindow } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const URL = "https://www.pumpguardian.app/pumps";

export default function RepulpeoQuillayes() {
  const openWindow = () => {
    window.open(URL, "pumpguardian", "width=1400,height=900,noopener");
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Repulpeo Quillayes</h1>
        <Card className="max-w-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center gap-5">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gauge className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Panel PumpGuardian</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={openWindow}>
                <AppWindow className="h-4 w-4 mr-2" />
                Abrir panel en ventana
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en pestaña nueva
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
