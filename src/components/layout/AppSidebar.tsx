import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, BarChart3, CreditCard, Home, Settings, ShoppingBag, Target, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { to: "/", icon: Home, label: "Cora" },
  { to: "/carteira", icon: Wallet, label: "Carteira" },
  { to: "/diagnostics", icon: BarChart3, label: "Diagnóstico" },
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
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const userName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Sidebar className="border-r border-white/[0.08] bg-[#111827]/95 shadow-[18px_0_70px_rgba(2,6,23,0.26)] backdrop-blur-2xl">
      <SidebarHeader
        className="flex items-center px-8"
        style={{
          minHeight: "calc(6rem + max(env(safe-area-inset-top, 0px), 16px))",
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        }}
      >
        <div className="flex items-center gap-4">
          <AppLogo size={40} className="hover:scale-110 transition-transform duration-500" />
          <div className="flex flex-col">
            <span className="font-display text-base font-bold tracking-tight text-white uppercase">Divvy Money</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Premium Access</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 gap-8 pt-6">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4 h-auto">
            Menu Principal
          </SidebarGroupLabel>
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
                          ? "bg-primary/15 text-white border-primary/30 shadow-[0_16px_36px_rgba(91,140,255,0.16)]"
                          : "text-muted-foreground hover:text-white hover:bg-[#1F2C42]/70 hover:border-white/[0.08]",
                      )}
                    >
                      <NavLink to={to} className="flex items-center gap-4 w-full h-full">
                        <Icon className={cn("h-5 w-5 transition-transform group-hover/menu-btn:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
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
          <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4 h-auto">
            Gestão
          </SidebarGroupLabel>
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
                          ? "bg-primary/15 text-white border-primary/30 shadow-[0_16px_36px_rgba(91,140,255,0.16)]"
                          : "text-muted-foreground hover:text-white hover:bg-[#1F2C42]/70 hover:border-white/[0.08]",
                      )}
                    >
                      <NavLink to={to} className="flex items-center gap-4 w-full h-full">
                        <Icon className={cn("h-5 w-5 transition-transform group-hover/menu-btn:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
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

      <SidebarFooter
        className="border-t border-white/[0.08] p-4"
        style={{ paddingBottom: "calc(1rem + max(env(safe-area-inset-bottom, 0px), 10px))" }}
      >
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-[#1F2C42]/70 transition-all group active:scale-[0.98]"
        >
          <Avatar className="h-10 w-10 border border-primary/25 shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
            <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-sm font-bold text-white truncate">{userName}</span>
            <span className="text-[10px] font-medium text-muted-foreground truncate">{user?.email}</span>
          </div>
        </button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
