import { 
  LayoutDashboard, 
  Settings2, 
  History,
  Activity,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ClipboardList,
  Droplet,
  FileText,
  Thermometer
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { SidebarDebugPanel } from "./SidebarDebugPanel";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Organigrama", url: "/equipment-tree", icon: GitBranch },
  { title: "Avisos y OT", url: "/work-orders", icon: ClipboardList },
  { title: "Informes", url: "/reports", icon: FileText },
  { title: "Control Temperatura STC", url: "/stc-temperatura", icon: Thermometer },
  { title: "Historial", url: "/history", icon: History },
  { title: "Lubricación Equipos", url: "/lubricacion-equipos", icon: Droplet },
  { title: "Activos", url: "/assets", icon: Settings2 },
  { title: "Admin", url: "/admin", icon: Settings2 },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 border border-white/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">SIMCON</span>
              <span className="text-xs text-white/70">Sistema Monitoreo de Condiciones</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-white/60 uppercase tracking-wider px-2 mb-2">
            {!isCollapsed && "Navegación"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/85 hover:bg-white/15 hover:text-white transition-colors"
                      activeClassName="bg-white/20 text-white font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="border-t border-sidebar-border">
        <SidebarDebugPanel />
      </div>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSidebar}
          className="w-full justify-center text-white/70 hover:text-white hover:bg-white/15"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Colapsar</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
