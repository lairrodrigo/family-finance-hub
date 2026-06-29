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
      <div className="mx-auto grid w-full max-w-xl grid-cols-6 items-center gap-1 px-2 py-3.5 md:max-w-none md:px-3 md:py-3">
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
                "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-1 py-2.5 transition-[background-color,color,border-color,box-shadow] duration-150 active:scale-[0.98] md:flex-row md:gap-2.5 md:rounded-[1.35rem] md:px-4 md:py-3",
                isActive
                  ? "bg-primary/15 text-white ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon className={cn("h-5 w-5 transition-colors duration-150", isActive && "text-primary")} />
              <span className={cn("text-[6.5px] font-black uppercase tracking-[0.08em] transition-opacity duration-150 md:text-[10px] md:tracking-[0.12em]", isActive ? "opacity-100" : "opacity-55")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
