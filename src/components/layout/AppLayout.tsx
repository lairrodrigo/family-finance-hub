import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Clock, Home, MoreHorizontal, ShoppingBag, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/diagnostics", icon: BarChart3, label: "Diagnóstico" },
  { to: "/shopping", icon: ShoppingBag, label: "Compras" },
  { to: "/history", icon: Clock, label: "Histórico" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="app-shell flex min-h-screen w-full overflow-x-hidden">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <SidebarInset className="flex flex-col bg-transparent w-full min-w-0 border-none">
        <div className="flex-1 w-full overflow-x-hidden safe-top">
          <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 lg:pt-8 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
            {children}
          </div>
        </div>

        <nav className="premium-bottom-nav fixed bottom-0 left-0 right-0 z-[100] lg:hidden safe-bottom transition-all pointer-events-auto">
          <div className="mx-auto flex max-w-xl items-center justify-around px-1 py-3.5">
            {tabs.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex min-w-[52px] flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-1.5 py-2.5 transition-all duration-300 active:scale-95",
                    isActive
                      ? "bg-primary/15 text-white shadow-[0_14px_34px_rgba(91,140,255,0.18)] ring-1 ring-primary/25"
                      : "text-muted-foreground hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110 text-primary")} />
                  <span className={cn("text-[6.5px] font-black uppercase tracking-[0.08em] transition-opacity", isActive ? "opacity-100" : "opacity-55")}>
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
