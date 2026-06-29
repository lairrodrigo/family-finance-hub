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

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Cora"),
  "/carteira": () => import("@/pages/Home"),
  "/diagnostics": () => import("@/pages/Diagnostics"),
  "/history": () => import("@/pages/History"),
  "/metas": () => import("@/pages/Metas"),
  "/more": () => import("@/pages/More"),
};

const prefetchedRoutes = new Set<string>();

function prefetchRoute(to: string) {
  const prefetcher = routePrefetchers[to];

  if (!prefetcher || prefetchedRoutes.has(to)) return;

  prefetchedRoutes.add(to);
  void prefetcher().catch(() => {
    prefetchedRoutes.delete(to);
  });
}

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
        "premium-bottom-nav safe-bottom pointer-events-auto",
        embedded
          ? "cora-bottom-nav"
          : "fixed bottom-0 left-0 right-0 z-[100] xl:hidden md:bottom-5 md:left-1/2 md:right-auto md:w-[min(760px,calc(100vw-3rem))] md:-translate-x-1/2 md:rounded-[2rem] md:border md:border-white/[0.08] md:pb-0",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-1 px-3 py-2.5 md:max-w-none md:px-4 md:py-3">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

          return (
            <NavLink
              key={to}
              to={to}
              onFocus={() => prefetchRoute(to)}
              onPointerEnter={() => prefetchRoute(to)}
              onTouchStart={() => prefetchRoute(to)}
              className={cn(
                "flex items-center justify-center transition-all duration-300 active:scale-[0.95]",
                isActive
                  ? "bg-primary/15 text-white ring-1 ring-primary/25 px-3.5 py-2.5 rounded-2xl gap-2 shrink-0 flex-grow-0"
                  : "flex-1 text-muted-foreground hover:bg-white/[0.05] hover:text-white py-2.5 rounded-2xl"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
              {isActive && (
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-white animate-fade-in truncate">
                  {label}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
