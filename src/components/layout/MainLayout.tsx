import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CriticalReportDownload } from "@/components/reports/CriticalReportDownload";
import { Separator } from "@/components/ui/separator";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium text-muted-foreground">SCIM</span>
            </div>
            <div className="flex items-center gap-2">
              <CriticalReportDownload />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
