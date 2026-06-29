import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Clock, Home, MoreHorizontal, Target, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/carteira", icon: Wallet, label: "Carteira" },
  { to: "/diagnostics", icon: BarChart3, label: "Diagnóstico" },
  { to: "/history", icon: Clock, label: "Histórico" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

type MobileBottomNavProps = {
  embedded?: boolean;
  className?: string;
};

export function MobileBottomNav({ embedded = false, className }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "premium-bottom-nav safe-bottom transition-all pointer-events-auto",
        embedded
          ? "cora-bottom-nav"
          : "fixed bottom-0 left-0 right-0 z-[100] xl:hidden md:bottom-5 md:left-1/2 md:right-auto md:w-[min(760px,calc(100vw-3rem))] md:-translate-x-1/2 md:rounded-[2rem] md:border md:border-white/[0.08] md:pb-0",
        className,
      )}
    >
      <div className="mx-auto flex max-w-xl items-center justify-around px-1 py-3.5 md:max-w-none md:px-3 md:py-3">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex min-w-[52px] flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-1.5 py-2.5 transition-all duration-300 active:scale-95 md:min-w-[94px] md:flex-row md:gap-2.5 md:rounded-[1.35rem] md:px-4 md:py-3",
                isActive
                  ? "bg-primary/15 text-white shadow-[0_14px_34px_rgba(91,140,255,0.18)] ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110 text-primary")} />
              <span className={cn("text-[6.5px] font-black uppercase tracking-[0.08em] transition-opacity md:text-[10px] md:tracking-[0.12em]", isActive ? "opacity-100" : "opacity-55")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
