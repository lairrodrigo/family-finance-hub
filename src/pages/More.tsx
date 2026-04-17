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
    <div className="animate-fade-in pb-8 max-w-2xl mx-auto px-1">
      <div className="flex flex-col items-center sm:items-start gap-4 mb-12 text-center sm:text-left pt-4">
        <Avatar className="h-24 w-24 rounded-[2.5rem] border border-primary/20 shadow-2xl">
          <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-black uppercase text-primary">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tighter">Minha Conta</h1>
          <p className="text-[10px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[250px]">{user?.email}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {menuItems.map(({ icon: Icon, label, description, to, color }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-4 sm:gap-5 rounded-[2rem] sm:rounded-[2.5rem] bg-[#0C0C0E] p-5 sm:p-6 border border-white/[0.05] text-left transition-all hover:bg-[#121214] hover:scale-[1.01] shadow-xl group active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] transition-transform group-hover:scale-110 shadow-lg shrink-0">
              <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-lg font-black text-white tracking-tight leading-none mb-1.5">{label}</p>
              <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-[0.15em] text-muted-foreground truncate">{description}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/[0.02] flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors shrink-0">
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-white/[0.05]">
        <Button
          variant="ghost"
          className="h-14 sm:h-16 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all group"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default MorePage;
