import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, ArrowLeftRight, Target, MoreHorizontal, Wallet, Clock, ShoppingBag, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/shopping", icon: ShoppingBag, label: "Compras" },
  { to: "/history", icon: Clock, label: "Histórico" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Desktop Sidebar Component (Internal to Layout for maximum reliability)
  const DesktopSidebar = () => (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-card md:flex z-50">
      <div className="flex h-16 items-center border-b border-border/50 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">DivvyMoney</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {tabs.map(({ to, icon: Icon, label, isCenter }) => {
          if (isCenter && isMobile) return null; // Don't show center button in sidebar
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background selection:bg-primary/10 overflow-hidden outline-none ring-0">
      {/* Desktop Navigation */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 h-screen overflow-y-auto transition-all duration-300 outline-none",
        !isMobile ? "md:pl-64" : ""
      )}>
        <div className={cn(
          "mx-auto w-full transition-all duration-300",
          !isMobile ? "max-w-6xl px-6 py-8" : "px-4 pt-4 pb-44"
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-6 left-6 right-6 z-[100] h-18 bg-[#0A0A0A]/90 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl flex items-center justify-around px-2 md:hidden">
          {tabs.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative px-3 py-1.5 rounded-xl",
                  isActive ? "text-primary" : "text-[#7B7B7B] hover:text-white"
                )}
              >
                <div className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300",
                  isActive && "bg-primary/20"
                )}>
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                </div>
                <span className="text-[9px] font-bold tracking-tight uppercase">{label}</span>
              </NavLink>
            );
          })}
        </nav>
    </div>
  );
}
