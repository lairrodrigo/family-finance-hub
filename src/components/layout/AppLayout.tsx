import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, ArrowLeftRight, PiggyBank, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { to: "/add", icon: Plus, label: "Adicionar", isCenter: true },
  { to: "/budgets", icon: PiggyBank, label: "Orçamentos" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Main content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
          {tabs.map(({ to, icon: Icon, label, isCenter }) => {
            const isActive = location.pathname === to;
            
            if (isCenter) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="mt-1 text-[10px] font-medium text-primary">
                    {label}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
