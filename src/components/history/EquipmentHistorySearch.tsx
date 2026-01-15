import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEquipmentSearch } from "@/hooks/useEquipmentHistory";
import { cn } from "@/lib/utils";

interface EquipmentHistorySearchProps {
  onSelectEquipment: (id: string) => void;
  selectedEquipmentId: string | null;
}

export function EquipmentHistorySearch({ 
  onSelectEquipment,
  selectedEquipmentId 
}: EquipmentHistorySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: results, isLoading } = useEquipmentSearch(debouncedTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedTerm.length >= 2) {
      setShowResults(true);
    }
  }, [debouncedTerm]);

  const handleSelect = (id: string, tag: string, name: string) => {
    onSelectEquipment(id);
    setSearchTerm(`${tag} - ${name}`);
    setShowResults(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setDebouncedTerm("");
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar equipo por TAG o nombre (mín. 2 caracteres)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => debouncedTerm.length >= 2 && setShowResults(true)}
        className="pl-10 pr-10"
      />
      {searchTerm && (
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

      {/* Search Results Dropdown */}
      {showResults && debouncedTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Buscando...
            </div>
          ) : results && results.length > 0 ? (
            <ul className="max-h-64 overflow-auto py-1">
              {results.map((eq) => (
                <li key={eq.id}>
                  <button
                    className={cn(
                      "w-full px-4 py-2 text-left hover:bg-accent transition-colors",
                      selectedEquipmentId === eq.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(eq.id, eq.tag, eq.name)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary">
                        {eq.tag}
                      </span>
                      <span className="text-foreground">{eq.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {eq.system.area.name} → {eq.system.name}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No se encontraron equipos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
