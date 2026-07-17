import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CriticalReportDownload } from "@/components/reports/CriticalReportDownload";
import { Separator } from "@/components/ui/separator";
import bgCorporate from "@/assets/bg-corporate.png";
import sincomBar from "@/assets/sincom-bar.png.asset.json";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
        <div className="flex min-h-screen w-full relative">
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bgCorporate})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(8px)',
              opacity: 0.16,
            }}
          />
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <img
                src={sincomBar.url}
                alt="SINCOM - Sistema de Monitoreo de Condiciones"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <CriticalReportDownload />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
