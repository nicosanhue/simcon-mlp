import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EquipmentSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function EquipmentSearch({ 
  searchTerm, 
  onSearchChange,
  placeholder = "Buscar equipo por nombre o tag..."
}: EquipmentSearchProps) {
  const [localValue, setLocalValue] = useState(searchTerm);

  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== searchTerm) {
        onSearchChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, searchTerm, onSearchChange]);

  const handleClear = () => {
    setLocalValue("");
    onSearchChange("");
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpiar búsqueda</span>
        </Button>
      )}
    </div>
  );
}
