import { 
  LayoutDashboard, 
  ClipboardEdit, 
  Settings2, 
  History,
  Activity,
  ChevronLeft,
  ChevronRight,
  GitBranch
} from "lucide-react";
import sidebarBg from "@/assets/sidebar-bg.png";
import { NavLink } from "@/components/NavLink";
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
  { title: "Registro Semanal", url: "/data-entry", icon: ClipboardEdit },
  { title: "Historial", url: "/history", icon: History },
  { title: "Activos", url: "/assets", icon: Settings2 },
  { title: "Admin", url: "/admin", icon: Settings2 },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border relative overflow-hidden"
      style={{ backgroundImage: `url(${sidebarBg})`, backgroundSize: '100% 100%', backgroundPosition: 'top left' }}
    >
      {/* Semi-transparent overlay for text readability */}
      <div className="absolute inset-0 bg-sidebar/70 backdrop-blur-sm z-0 pointer-events-none" />
      
      <SidebarHeader className="border-b border-white/20 p-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 border border-white/25">
            <Activity className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">SCIM</span>
              <span className="text-xs text-white/70">Condition Monitoring</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 relative z-10">
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/90 hover:bg-white/15 hover:text-white transition-colors"
                      activeClassName="bg-white/20 text-white font-semibold"
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

      <SidebarFooter className="border-t border-white/20 p-2 relative z-10">
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
