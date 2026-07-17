import { useState } from "react";
import { UserCircle2, LogOut, ShieldCheck } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useProfile, type ProfileName } from "@/contexts/ProfileContext";
import { ProfileLoginDialog } from "./ProfileLoginDialog";
import { toast } from "sonner";

const PROFILES: ProfileName[] = ["MonCon", "AdC"];

export function ProfileMenu() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, isEditor, logout } = useProfile();
  const [dialogFor, setDialogFor] = useState<ProfileName | null>(null);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-medium text-white/60 uppercase tracking-wider px-2 mb-2">
          {!collapsed && "Perfil"}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {isEditor ? (
              <>
                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/90 bg-white/10">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm">Perfil {profile}</span>
                        <Badge className="bg-emerald-500/30 text-emerald-100 border-0 text-[10px]">
                          activo
                        </Badge>
                      </div>
                    )}
                  </div>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Cerrar sesión de perfil"
                    onClick={() => {
                      logout();
                      toast.success("Sesión de perfil cerrada");
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/85 hover:bg-white/15 hover:text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Cerrar sesión</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
              PROFILES.map((p) => (
                <SidebarMenuItem key={p}>
                  <SidebarMenuButton
                    tooltip={`Perfil ${p}`}
                    onClick={() => setDialogFor(p)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/85 hover:bg-white/15 hover:text-white transition-colors"
                  >
                    <UserCircle2 className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Perfil {p}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <ProfileLoginDialog
        open={dialogFor !== null}
        onOpenChange={(v) => !v && setDialogFor(null)}
        profile={dialogFor}
      />
    </>
  );
}
