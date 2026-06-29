import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, CreditCard, Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: Users, label: "Família", description: "Membros e permissões", to: "/family", color: "text-blue-400" },
  { icon: CreditCard, label: "Cartões", description: "Meus cartões registrados", to: "/cards", color: "text-primary" },
  { icon: Settings, label: "Ajustes", description: "Configurações do aplicativo", to: "/settings", color: "text-muted-foreground" },
];

const MorePage = () => {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-md animate-fade-in flex-col pb-4 sm:max-w-2xl sm:pb-8">
      <div className="flex flex-col items-center gap-4 pb-9 pt-3 text-center sm:items-start sm:pb-12 sm:pt-4 sm:text-left">
        <Avatar className="h-[5.5rem] w-[5.5rem] rounded-[2rem] border border-primary/20 shadow-[0_24px_70px_rgba(91,140,255,0.16)] sm:h-24 sm:w-24 sm:rounded-[2.5rem]">
          <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-black uppercase text-primary sm:rounded-[2.5rem]">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="w-full min-w-0 space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white">Minha Conta</h1>
          <p className="mx-auto max-w-[250px] truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:mx-0 sm:text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {menuItems.map(({ icon: Icon, label, description, to, color }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="group flex w-full min-w-0 items-center gap-4 rounded-[1.55rem] border border-white/[0.08] bg-[rgba(24,34,51,0.72)] p-4 text-left shadow-[0_18px_50px_rgba(2,6,23,0.24)] transition-[background-color,border-color,transform] duration-150 hover:border-white/[0.13] hover:bg-[rgba(36,49,73,0.82)] active:scale-[0.99] sm:gap-5 sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/[0.07] bg-white/[0.04] shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl">
              <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-base font-black leading-none tracking-tight text-white sm:text-lg">{label}</p>
              <p className="truncate text-[8.5px] font-black uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">{description}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-muted-foreground transition-colors group-hover:text-white sm:h-10 sm:w-10">
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-9 border-t border-white/[0.06] pt-6 sm:mt-12 sm:pt-8">
        <Button
          variant="ghost"
          className="group h-14 w-full rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-[background-color,color] hover:bg-destructive/5 hover:text-destructive sm:h-16 sm:rounded-[2rem]"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default MorePage;
