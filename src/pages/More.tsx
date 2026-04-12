import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, CreditCard, Wallet, Settings, ChevronRight } from "lucide-react";

const menuItems = [
  { icon: Users, label: "Família", description: "Gerenciar membros" },
  { icon: Wallet, label: "Contas", description: "Gerenciar contas bancárias" },
  { icon: CreditCard, label: "Cartões", description: "Gerenciar cartões" },
  { icon: Settings, label: "Configurações", description: "Preferências do app" },
];

const MorePage = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="px-4 pt-12 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-foreground">Mais</h1>
      <p className="mt-1 text-sm text-muted-foreground truncate">{user?.email}</p>

      <div className="mt-6 space-y-2">
        {menuItems.map(({ icon: Icon, label, description }) => (
          <button
            key={label}
            className="flex w-full items-center gap-4 rounded-xl bg-card p-4 border border-border text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        className="mt-8 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={signOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </div>
  );
};

export default MorePage;
