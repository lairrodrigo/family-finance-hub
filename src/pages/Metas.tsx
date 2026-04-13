import { useNavigate } from "react-router-dom";
import { DashboardSection, DashedAddCard } from "@/components/dashboard/DashboardSection";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useGoals, Goal } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

const MetasPage = () => {
  const navigate = useNavigate();
  const { goals, isLoading, error } = useGoals();

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
    const formattedTarget = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.target_amount);
    const formattedCurrent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.current_amount);

    return (
      <Card className="p-7 border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] shadow-2xl space-y-6 transition-all hover:translate-y-[-4px] group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5 transition-transform group-hover:scale-110">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight">{goal.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">{goal.category || "Geral"}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-primary tracking-tighter">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <Progress value={progress} className="h-1.5 bg-white/[0.05]" />
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
            <span className="text-white/40">{formattedCurrent}</span>
            <span className="text-white">{formattedTarget}</span>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 px-4 pt-4 pb-20 animate-fade-in md:pt-0">
        <div className="space-y-8">
          <div className="h-12 w-48 bg-white/[0.02] rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isTableMissing = (error as any)?.code === "PGRST116" || (error as any)?.message?.includes("not found");
  
  return (
    <div className="flex flex-col gap-10 px-4 pt-4 pb-32 animate-fade-in md:pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Metas</h1>
          <p className="text-sm font-medium text-white/30"> Acompanhe seus objetivos financeiros.</p>
        </div>
        <Button 
          onClick={() => navigate("/metas/new")}
          className="hidden md:flex h-12 items-center gap-2 rounded-2xl bg-white text-black font-bold shadow-xl shadow-white/5 hover:bg-white/90 hover:scale-[1.02] transition-all px-6"
        >
          <Plus className="h-5 w-5" />
          Nova Meta
        </Button>
      </div>

      {isTableMissing ? (
        <Card className="p-10 border-dashed border-2 border-white/5 bg-white/[0.01] rounded-[2.5rem] flex flex-col items-center text-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Plus className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Configuração Pendente</h2>
            <p className="text-sm text-white/30 max-w-sm font-medium">
              Para usar as metas, você precisa rodar o script de banco de dados (SQL) no seu painel do Supabase.
            </p>
          </div>
        </Card>
      ) : (goals && goals.length > 0) ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
          <DashedAddCard label="Criar nova meta" onClick={() => navigate("/metas/new")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <DashboardSection title="Em andamento" icon={Target}>
            <DashedAddCard label="Criar sua primeira meta" onClick={() => navigate("/metas/new")} />
          </DashboardSection>
        </div>
      )}

      {/* Floating Action Button for mobile */}
      <Button 
        onClick={() => navigate("/metas/new")}
        className="fixed bottom-24 right-6 z-50 h-16 w-16 rounded-3xl bg-white text-black shadow-2xl shadow-white/10 active:scale-90 transition-all md:hidden border-none"
      >
        <Plus className="h-7 w-7" />
      </Button>
    </div>
  );
};

export default MetasPage;
