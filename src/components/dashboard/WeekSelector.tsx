import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WeekSelectorProps {
  week: number;
  year: number;
  onWeekChange: (week: number) => void;
  onYearChange: (year: number) => void;
}

export function WeekSelector({ week, year, onWeekChange, onYearChange }: WeekSelectorProps) {
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Período:</span>
      </div>
      <Select value={week.toString()} onValueChange={(v) => onWeekChange(parseInt(v))}>
        <SelectTrigger className="w-[120px] bg-secondary border-border">
          <SelectValue placeholder="Semana" />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((w) => (
            <SelectItem key={w} value={w.toString()}>
              Semana {w}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
        <SelectTrigger className="w-[100px] bg-secondary border-border">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
