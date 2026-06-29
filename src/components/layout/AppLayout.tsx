import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex h-[100dvh] min-h-[100dvh] w-full overflow-hidden">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <SidebarInset className="flex h-full min-h-0 flex-col bg-transparent w-full min-w-0 border-none">
        <div className="safe-top min-h-0 flex-1 w-full overflow-x-hidden overflow-y-auto custom-scrollbar-hide">
          <div className="w-full max-w-[1180px] mx-auto px-5 sm:px-6 md:px-8 xl:px-10 pt-5 md:pt-8 xl:pt-8 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] md:pb-10">
            {children}
          </div>
        </div>

        <MobileBottomNav className="md:hidden" />
      </SidebarInset>
    </div>
  );
}
