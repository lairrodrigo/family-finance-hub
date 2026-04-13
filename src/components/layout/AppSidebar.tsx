import { NavLink, useLocation } from "react-router-dom";
import { Home, ArrowLeftRight, Target, MoreHorizontal, Wallet, Users, Settings, ShoppingBag, CreditCard } from "lucide-react";
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
import { AppLogo } from "../ui/AppLogo";

const navItems = [
  { to: "/", icon: Home, label: "Visão Geral" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Extrato" },
  { to: "/shopping", icon: ShoppingBag, label: "Compras" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/cards", icon: CreditCard, label: "Meus Cartões" },
];

const managementItems = [
  { to: "/family", icon: Users, label: "Família" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-white/[0.05] bg-[#0C0C0E]">
      <SidebarHeader className="h-24 flex items-center px-8">
        <div className="flex items-center gap-4">
          <AppLogo size={40} className="hover:scale-110 transition-transform duration-500" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white uppercase">Divvy Money</span>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Premium Access</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 gap-8 pt-6">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.3em] text-white/10 mb-4 h-auto">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-14 px-5 rounded-2xl transition-all duration-300 group/menu-btn border border-transparent",
                        isActive 
                          ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                          : "text-white/40 hover:text-white hover:bg-white/[0.02] hover:border-white/[0.05]"
                      )}
                    >
                      <NavLink to={to} className="flex items-center gap-4 w-full h-full">
                        <Icon className={cn("h-5 w-5 transition-transform group-hover/menu-btn:scale-110", isActive ? "text-primary" : "text-white/20")} />
                        <span className="text-sm font-bold tracking-tight">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.3em] text-white/10 mb-4 h-auto">Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {managementItems.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to);
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-14 px-5 rounded-2xl transition-all duration-300 group/menu-btn border border-transparent",
                        isActive 
                          ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                          : "text-white/40 hover:text-white hover:bg-white/[0.02] hover:border-white/[0.05]"
                      )}
                    >
                      <NavLink to={to} className="flex items-center gap-4 w-full h-full">
                        <Icon className={cn("h-5 w-5 transition-transform group-hover/menu-btn:scale-110", isActive ? "text-primary" : "text-white/20")} />
                        <span className="text-sm font-bold tracking-tight">{label}</span>
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
