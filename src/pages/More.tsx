import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, CreditCard, Settings, ChevronRight } from "lucide-react";

import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: Users, label: "Família", description: "Membros e permissões", to: "/family" },
  { icon: CreditCard, label: "Cartões", description: "Meus cartões registrados", to: "/cards" },
  { icon: Settings, label: "Ajustes", description: "Configurações do aplicativo", to: "/settings" },
];

const MorePage = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in pb-8 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1 mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Mais</h1>
        <p className="text-sm font-medium text-white/20 truncate">{user?.email}</p>
      </div>

      <div className="grid gap-4">
        {menuItems.map(({ icon: Icon, label, description, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-5 rounded-[2.5rem] bg-[#0C0C0E] p-6 border border-white/[0.05] text-left transition-all hover:bg-[#121214] hover:scale-[1.02] hover:shadow-2xl shadow-black/40 group active:scale-[0.98]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] transition-transform group-hover:scale-110 shadow-xl">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white tracking-tight leading-none mb-1.5">{label}</p>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20">{description}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-white/[0.02] flex items-center justify-center text-white/10 group-hover:text-white transition-colors">
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 pt-12 border-t border-white/[0.05]">
        <Button
          variant="ghost"
          className="h-16 w-full text-white/20 hover:text-destructive hover:bg-destructive/5 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-[10px] transition-all"
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
