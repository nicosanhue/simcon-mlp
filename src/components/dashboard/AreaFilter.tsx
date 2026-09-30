import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Area {
  id: string;
  name: string;
}

interface AreaFilterProps {
  areas: Area[];
  selectedArea: string;
  onAreaChange: (areaId: string) => void;
}

// Orden fijo de áreas; cualquier área nueva se agrega al final en orden alfabético.
const AREA_ORDER = ["Transporte de Fluidos", "Tranque Mauro", "Puerto", "Desaladora"];

function sortAreas(areas: Area[]): Area[] {
  return [...areas].sort((a, b) => {
    const ia = AREA_ORDER.indexOf(a.name);
    const ib = AREA_ORDER.indexOf(b.name);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.name.localeCompare(b.name, "es");
  });
}

export function AreaFilter({ areas, selectedArea, onAreaChange }: AreaFilterProps) {
  const options: { id: string; name: string }[] = [
    { id: "all", name: "Todas las áreas" },
    ...sortAreas(areas),
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span className="text-sm font-medium">Área:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => {
          const active = selectedArea === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onAreaChange(option.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-secondary text-foreground border-border hover:bg-secondary/70"
              )}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
