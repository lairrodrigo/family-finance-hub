import { useState, useEffect } from "react";
import { Plus, Eye, EyeOff, Lock, ChevronRight, CreditCard, Target, Wallet } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { QuickAddTransaction } from "@/components/dashboard/QuickAddTransaction";
import { useGoals } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";

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

const HomePage = () => {
  const { showValues, toggleShowValues } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [fullTransactions, setFullTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    try {
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user.id).single();
      if (!profile?.family_id) return;

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cards:", error);
      } else if (data) {
        setCards(data);
      }
    } catch (err) {
      console.error("Critical error in fetchCards:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user.id).single();
      if (!profile?.family_id) return;

      // Buscar Transações (mais colunas para a IA)
      const { data: txs, error: txsError } = await supabase
        .from("transactions")
        .select("amount, type, category_id, date")
        .eq("family_id", profile.family_id)
        .order("date", { ascending: false });

      if (txsError) {
        console.error("Error fetching transactions:", txsError);
      } else if (txs) {
        setFullTransactions(txs);
        const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        setTotals({ income, expense });
      }

      // Buscar Categorias para nomes
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("id, name");

      if (catsError) {
        console.error("Error fetching categories:", catsError);
      } else if (cats) {
        setCategories(cats);
      }
    } catch (err) {
      console.error("Critical error in fetchDashboardData:", err);
    } finally {
      setLoading(false);
    }
  };

  const balance = totals.income - totals.expense;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-8 pb-8 animate-fade-in">
      <DashboardHeader />
      
      {/* Dual Experience Layout Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column - Management/Action (8 units on Desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Main Balance Card - Master Fintech Premium Version */}
          <Card className="relative overflow-hidden border border-white/[0.05] bg-gradient-to-br from-[#121212] via-[#080808] to-[#000000] p-9 rounded-[3.5rem] shadow-3xl group">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors duration-1000" />
            
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Saldo disponível</p>
              <Button variant="ghost" size="icon" onClick={toggleShowValues} className="h-8 w-8 min-w-0 text-white/20 hover:text-white transition-colors">
                {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white/30 mr-1">R$</span>
              <p className="font-display text-6xl font-bold tracking-tighter text-white">
                {showValues ? balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "••••••"}
              </p>
            </div>
            
            <div className="mt-14 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#111111] flex items-center justify-center text-white/20 border border-white/[0.03] shadow-inner">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-white/20">Comprometido</span>
                  <span className="text-sm font-bold text-white/80">{showValues ? formatCurrency(0) : "R$ ••••"}</span>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate("/history")}
                className="h-12 px-9 rounded-2xl bg-[#98B9FE] text-black font-bold hover:bg-white shadow-2xl shadow-blue-500/10 transition-all active:scale-95"
              >
                Detalhes
              </Button>
            </div>
          </Card>

          {/* Quick Add Section — Direct on Home */}
          <QuickAddTransaction onSuccess={fetchDashboardData} />

          {/* Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SummaryCard label="Receitas" value={showValues ? formatCurrency(totals.income) : "••••"} type="income" />
            <SummaryCard label="Despesas" value={showValues ? formatCurrency(totals.expense) : "••••"} type="expense" />
          </div>

          {/* Credit Cards Section - Premium Carousel (Fluid full-width of column) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Cartões de crédito</h2>
              <Button variant="ghost" className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:bg-transparent" onClick={() => navigate("/cards")}>
                Ver todos <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
              <Card 
                onClick={() => navigate("/cards")}
                className="min-w-[200px] h-[140px] bg-[#0A0A0B] border-dashed border-2 border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-[#111111] hover:border-white/10 transition-all rounded-[1.5rem] group"
              >
                <div className="h-10 w-10 rounded-full bg-white/[0.02] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5 text-white/20" />
                </div>
                <span className="text-[9px] font-medium text-white/20 uppercase tracking-[0.2em]">Adicionar cartão</span>
              </Card>
              
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

        {/* Side Column - Insights & Goals (4 units on Desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* AI Insights - Premium Position */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white/20 uppercase tracking-[0.3em] px-1">Inteligência Financeira</h2>
            <InsightsSection 
              transactions={fullTransactions} 
              categories={categories} 
              isLoading={loading}
            />
          </div>
          
          {/* Goals Summary - Side Vision */}
          <div className="space-y-6 bg-[#0C0C0E]/50 p-6 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">Metas Ativas</h2>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold text-primary uppercase" onClick={() => navigate("/metas")}>
                Gerenciar
              </Button>
            </div>
            <HomeGoalsSection />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
