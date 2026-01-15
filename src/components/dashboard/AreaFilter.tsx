import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Area {
  id: string;
  name: string;
}

interface AreaFilterProps {
  areas: Area[];
  selectedArea: string;
  onAreaChange: (areaId: string) => void;
}

export function AreaFilter({ areas, selectedArea, onAreaChange }: AreaFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span className="text-sm font-medium">Área:</span>
      </div>
      <Select value={selectedArea} onValueChange={onAreaChange}>
        <SelectTrigger className="w-[200px] bg-secondary border-border">
          <SelectValue placeholder="Todas las áreas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las áreas</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
