import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Eye, EyeOff, CreditCard, Target, Plus, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DashboardSection, DashedAddCard } from "@/components/dashboard/DashboardSection";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { AddCardDialog } from "@/components/dashboard/AddCardDialog";
import { useNavigate } from "react-router-dom";
import { useGoals } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
const HomePage = () => {
  const { showValues, toggleShowValues } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  
   const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactionTotals();
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false });

      if (data) setCards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactionTotals = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("family_id", profile.family_id);

      if (txs) {
        const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        setTotals({ income, expense });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const balance = totals.income - totals.expense;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-2 pb-32 animate-fade-in md:pt-0">
      <DashboardHeader />
      
      <div className="flex flex-col gap-8">
        {/* Main Balance Card */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[#121212] to-[#000000] p-8 rounded-[3.5rem] shadow-2xl border-t border-white/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#555555]">Saldo disponível</p>
            <Button variant="ghost" size="icon" onClick={toggleShowValues} className="h-8 w-8 text-[#444444] hover:text-white transition-colors">
              {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <p className="font-display text-5xl font-black tracking-tighter text-white">
            {showValues ? formatCurrency(balance) : "R$ ••••"}
          </p>
          
          <div className="mt-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#111111] flex items-center justify-center text-[#555555] border border-white/[0.03]">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#555555]">Comprometido</span>
                <span className="text-sm font-black text-white italic">{showValues ? formatCurrency(0) : "R$ ••••"}</span>
              </div>
            </div>
            
            <Button className="h-12 px-8 rounded-2xl bg-white text-black font-black hover:bg-white/90 shadow-2xl shadow-white/10 transition-all active:scale-95">
              Detalhes
            </Button>
          </div>
        </Card>

        {/* Totals Grid */}
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard label="Receitas" value={showValues ? formatCurrency(totals.income) : "••••"} type="income" />
          <SummaryCard label="Despesas" value={showValues ? formatCurrency(totals.expense) : "••••"} type="expense" />
        </div>

        {/* Credit Cards Section */}
        <DashboardSection title="Cartões de crédito" icon={ChevronRight} actionLabel="Ver todos" onAction={() => navigate("/cards")}>
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
            <div className="min-w-[280px]">
              <AddCardDialog 
                open={isAddCardOpen} 
                onOpenChange={setIsAddCardOpen}
                onSuccess={fetchCards}
                trigger={<DashedAddCard label="Adicionar cartão" />}
              />
            </div>
            
            {cards.map((card) => (
              <Card key={card.id} className="min-w-[280px] h-[180px] bg-gradient-to-br from-[#111111] to-[#000000] rounded-[2.5rem] p-6 border border-white/5 text-white relative flex flex-col justify-between overflow-hidden shadow-2xl group">
                 <div className="flex justify-between items-start z-10">
                    <div className="h-10 w-10 text-white/20 border border-white/5 bg-white/5 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">{card.brand}</span>
                 </div>
                 <div className="z-10">
                    <p className="text-[10px] font-black opacity-30 mb-1 uppercase tracking-widest">{card.name}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-xl font-black tracking-[0.2em] italic">• • • • {card.last_four}</p>
                      <p className="text-sm font-black text-blue-400">R$ {card.credit_limit?.toLocaleString()}</p>
                    </div>
                 </div>
                 {/* Decorative glow */}
                 <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-white/5 blur-[80px] rounded-full group-hover:bg-white/10 transition-colors" />
              </Card>
            ))}
          </div>
        </DashboardSection>

        {/* Insights IA */}
        <InsightsSection />
        
        {/* Goals */}
        <HomeGoalsSection navigate={navigate} />
      </div>
    </div>
  );
};

export default HomePage;

const HomeGoalsSection = ({ navigate }: { navigate: (path: string) => void }) => {
  const { goals, isLoading } = useGoals();
  const displayGoals = goals?.slice(0, 2) || [];

  return (
    <DashboardSection 
      title="Metas" 
      icon={Target} 
      actionLabel={goals && goals.length > 0 ? "Ver todas" : undefined}
      onAction={() => navigate("/metas")}
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
        </div>
      ) : displayGoals.length > 0 ? (
        <div className="space-y-3">
          {displayGoals.map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            return (
              <Card key={goal.id} className="p-4 border-none bg-card/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate">{goal.name}</span>
                  <span className="text-[10px] font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-primary/10" />
              </Card>
            );
          })}
        </div>
      ) : (
        <DashedAddCard label="Criar sua primeira meta" onClick={() => navigate("/metas/new")} />
      )}
    </DashboardSection>
  );
};
