import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, ArrowLeftRight, Target, MoreHorizontal, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/add", icon: Plus, label: "Adicionar" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">DivvyMoney</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider text-muted-foreground">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1.5">
              {navItems.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to;
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-11 px-4 transition-all hover:bg-muted group/menu-btn cursor-pointer",
                        isActive && "bg-primary/5 text-primary hover:bg-primary/10"
                      )}
                    >
                      <NavLink to={to} className="flex items-center gap-3 w-full h-full">
                        <Icon className={cn("h-5 w-5 transition-colors shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover/menu-btn:text-foreground")} />
                        <span className="font-medium truncate">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
