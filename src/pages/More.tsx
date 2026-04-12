import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, CreditCard, Wallet, Settings, ChevronRight, ShoppingBag } from "lucide-react";

import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: Users, label: "Família", description: "Gerenciar membros", to: "/family" },
  { icon: CreditCard, label: "Cartões", description: "Gerenciar cartões", to: "/cards" },
  { icon: Wallet, label: "Contas", description: "Gerenciar contas bancárias", to: "/accounts" },
  { icon: Settings, label: "Configurações", description: "Preferências do app", to: "/settings" },
];

const MorePage = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-12 animate-fade-in pb-32">
      <h1 className="font-display text-2xl font-bold text-foreground">Mais</h1>
      <p className="mt-1 text-sm text-muted-foreground truncate">{user?.email}</p>

      <div className="mt-6 space-y-2">
        {menuItems.map(({ icon: Icon, label, description, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 border border-border text-left transition-all hover:bg-muted/50 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        className="mt-8 h-12 w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-bold"
        onClick={signOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </div>
  );
};

export default MorePage;
