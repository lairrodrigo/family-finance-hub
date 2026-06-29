import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen w-full overflow-x-hidden">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <SidebarInset className="flex flex-col bg-transparent w-full min-w-0 border-none">
        <div className="flex-1 w-full overflow-x-hidden safe-top">
          <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 xl:px-10 pt-5 md:pt-8 xl:pt-8 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
            {children}
          </div>
        </div>

        <MobileBottomNav className="md:hidden" />
      </SidebarInset>
    </div>
  );
}
