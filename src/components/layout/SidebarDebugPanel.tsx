import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, HardDrive, FileText } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarDebugPanel() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: counts } = useQuery({
    queryKey: ["debug-counts-sidebar"],
    queryFn: async () => {
      const [eqRes, repRes] = await Promise.all([
        supabase.from("equipment").select("id", { count: "exact", head: true }),
        supabase.from("weekly_reports").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalEquipment: eqRes.count ?? 0,
        totalReports: repRes.count ?? 0,
      };
    },
  });

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted" title={`Equipos: ${counts?.totalEquipment ?? "..."}`}>
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted" title={`Reportes: ${counts?.totalReports ?? "..."}`}>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Database className="h-3.5 w-3.5" />
        <span>Debug BD</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">Equipos</p>
          <p className="text-sm font-bold text-sidebar-foreground">{counts?.totalEquipment ?? "..."}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">Reportes</p>
          <p className="text-sm font-bold text-sidebar-foreground">{counts?.totalReports ?? "..."}</p>
        </div>
      </div>
    </div>
  );
}
