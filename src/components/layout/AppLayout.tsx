import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MoreHorizontal, ShoppingBag, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/shopping", icon: ShoppingBag, label: "Compras" },
  { to: "/history", icon: Clock, label: "Histórico" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-[#050505] overflow-x-hidden">
      {/* Desktop Navigation - Primary Sidebar (Hidden on Mobile) */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <SidebarInset className="flex flex-col bg-transparent w-full min-w-0 border-none">
        <div className="flex-1 w-full overflow-x-hidden safe-top">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
            {children}
          </div>
        </div>

        {/* Mobile Navigation - Fintech Premium Style (Hidden on Desktop) */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden border-t border-white/[0.05] bg-[#0A0A0A]/85 backdrop-blur-3xl safe-bottom transition-all pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-3">
            {tabs.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
              
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                    isActive ? "text-white bg-white/[0.05]" : "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                  <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] transition-opacity", isActive ? "opacity-100" : "opacity-40")}>
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </SidebarInset>
    </div>
  );
}

