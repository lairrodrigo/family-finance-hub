import { useMemo } from "react";
import { Plus, Eye, EyeOff, Lock, ChevronRight, CreditCard, Target } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { QuickAddTransaction } from "@/components/dashboard/QuickAddTransaction";
import { useGoals } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/hooks/usePermissions";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useCards } from "@/hooks/useCards";

const HomeGoalsSection = () => {
  const { goals, isLoading } = useGoals();
  const navigate = useNavigate();
  const displayGoals = goals?.slice(0, 2) || [];

  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
  
  if (displayGoals.length === 0) {
    return (
      <Card onClick={() => navigate("/metas/new")} className="p-6 border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center cursor-pointer rounded-xl">
        <Target className="h-6 w-6 text-muted-foreground mb-2" />
        <span className="text-xs font-bold text-muted-foreground text-center">Defina sua primeira meta financeira</span>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {displayGoals.map((goal) => {
        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
        return (
          <Card key={goal.id} className="p-4 border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{goal.name}</span>
              <span className="text-[10px] font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </Card>
        );
      })}
    </div>
  );
};

const NoFamilyBanner = () => {
  const navigate = useNavigate();
  return (
    <Card className="p-6 border border-primary/20 bg-primary/5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Plus className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Crie seu Espaço Familiar</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Para começar a lançar gastos, você precisa de um workspace.</p>
        </div>
      </div>
      <Button 
        onClick={() => navigate("/family")}
        className="h-12 px-8 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-white/5 whitespace-nowrap"
      >
        Configurar Agora
      </Button>
    </Card>
  );
};

const HomePage = () => {
  const { showValues, toggleShowValues } = useSettings();
  const { familyId, loading: authLoading } = useAuth();
  const { isAdmin, canManageAssets, canCreateTransaction } = usePermissions();
  const navigate = useNavigate();
  
  // Optimized Global Hooks (React Query)
  const { data: fullTransactions, isLoading: txsLoading, refetch: refetchTransactions } = useTransactions();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: cards, isLoading: cardsLoading } = useCards();

  const loading = txsLoading || catsLoading || cardsLoading || authLoading;

  const { totals, balance } = useMemo(() => {
    const income = (fullTransactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = (fullTransactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totals: { income, expense },
      balance: income - expense
    };
  }, [fullTransactions]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (authLoading && !familyId) {
    return (
      <div className="flex flex-col gap-8 pb-8 animate-fade-in">
        <DashboardHeader />
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8 animate-fade-in">
      <DashboardHeader />
      
      {!familyId && !authLoading && <NoFamilyBanner />}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="relative overflow-hidden border border-white/[0.05] bg-gradient-to-br from-[#121212] via-[#080808] to-[#000000] p-7 sm:p-9 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-3xl group transition-all">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors duration-1000" />
            
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Saldo disponível</p>
              <Button variant="ghost" size="icon" onClick={toggleShowValues} className="h-8 w-8 min-w-0 text-muted-foreground hover:text-white transition-colors">
                {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-baseline gap-1 overflow-hidden">
              <span className="text-xl sm:text-2xl font-bold text-muted-foreground mr-1 shrink-0">R$</span>
              <p className="font-display text-4xl sm:text-6xl font-black tracking-tighter text-white truncate break-all">
                {showValues ? balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "••••••"}
              </p>
            </div>
            
            <div className="mt-10 sm:mt-14 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#111111] flex items-center justify-center text-muted-foreground border border-white/[0.03] shadow-inner shrink-0">
                  <Lock className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Comprometido</span>
                  <span className="text-xs sm:text-sm font-bold text-white/80">{showValues ? formatCurrency(0) : "R$ ••••"}</span>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate("/history")}
                className="h-11 sm:h-12 px-6 sm:px-9 rounded-2xl bg-[#98B9FE] text-black font-bold hover:bg-white shadow-2xl shadow-blue-500/10 transition-all active:scale-95 text-xs"
              >
                Detalhes
              </Button>
            </div>
          </Card>

          {/* Somente exibe se puder criar transação */}
          {canCreateTransaction && (
            <QuickAddTransaction onSuccess={() => refetchTransactions()} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SummaryCard label="Receitas" value={showValues ? formatCurrency(totals.income) : "••••"} type="income" />
            <SummaryCard label="Despesas" value={showValues ? formatCurrency(totals.expense) : "••••"} type="expense" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Cartões de crédito</h2>
              <Button variant="ghost" className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:bg-transparent" onClick={() => navigate("/cards")}>
                Ver todos <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
              {/* Somente Admin pode adicionar cartão */}
              {canManageAssets && (
                <Card 
                  onClick={() => navigate("/cards")}
                  className="min-w-[200px] h-[140px] bg-[#0A0A0B] border-dashed border-2 border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-[#111111] hover:border-white/10 transition-all rounded-[1.5rem] group"
                >
                  <div className="h-10 w-10 rounded-full bg-white/[0.02] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Adicionar cartão</span>
                </Card>
              )}
              
              {(cards || []).map((card) => (
                <Card key={card.id} className="min-w-[280px] h-[140px] bg-gradient-to-br from-[#3b82f6] to-[#1e40af] rounded-[1.5rem] p-6 border-none text-white relative flex flex-col justify-between shadow-xl overflow-hidden group">
                   <div className="flex justify-between items-start z-10">
                      <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <CreditCard className="h-5 w-5 opacity-80" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{card.brand}</span>
                   </div>
                   <div className="z-10">
                      <p className="text-lg font-bold tracking-[0.4em] mb-1">•••• {card.last_four}</p>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-bold opacity-60 uppercase">{card.name}</p>
                        <p className="text-sm font-bold">R$ {card.credit_limit?.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full" />
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] px-1">Divvy IA</h2>
            <InsightsSection 
              transactions={fullTransactions} 
              categories={categories} 
              isLoading={loading}
            />
          </div>
          
          <div className="space-y-6 bg-[#0C0C0E]/50 p-6 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">Metas Ativas</h2>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-primary uppercase" onClick={() => navigate("/metas")}>
                  Gerenciar
                </Button>
              )}
            </div>
            <HomeGoalsSection />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;



