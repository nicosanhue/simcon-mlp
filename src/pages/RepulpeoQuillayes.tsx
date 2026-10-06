import { ExternalLink } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

const URL = "https://www.pumpguardian.app/pumps";

export default function RepulpeoQuillayes() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Repulpeo Quillayes</h1>
          <Button asChild variant="outline" size="sm">
            <a href={URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir en pestaña nueva
            </a>
          </Button>
        </div>
        <iframe
          src={URL}
          title="Repulpeo Quillayes"
          className="w-full rounded-lg border border-border bg-card"
          style={{ height: "calc(100vh - 10rem)" }}
        />
      </div>
    </MainLayout>
  );
}
