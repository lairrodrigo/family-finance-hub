import { useNavigate } from "react-router-dom";
import { DashboardSection, DashedAddCard } from "@/components/dashboard/DashboardSection";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useGoals, Goal } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

import { usePermissions } from "@/hooks/usePermissions";

const MetasPage = () => {
  const navigate = useNavigate();
  const { goals, isLoading, error } = useGoals();
  const { isAdmin } = usePermissions();

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
    const formattedTarget = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.target_amount);
    const formattedCurrent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.current_amount);

    return (
      <Card className="premium-panel-hover space-y-5 rounded-[1.75rem] border border-white/[0.08] bg-[rgba(24,34,51,0.72)] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.28)] transition-transform sm:space-y-6 sm:rounded-[2rem] sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5 shrink-0">
              <Target className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="font-black text-white tracking-tight text-sm sm:text-base">{goal.name}</h3>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{goal.category || "Geral"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-black text-primary tracking-tighter">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <Progress value={progress} className="h-1.5 bg-white/[0.05]" />
          <div className="flex justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-tight">
            <span className="text-muted-foreground">{formattedCurrent}</span>
            <span className="text-white">{formattedTarget}</span>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in">
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

  const goalError = error as { code?: string; message?: string } | null | undefined;
  const isTableMissing = goalError?.code === "PGRST116" || goalError?.message?.includes("not found");
  
  return (
    <div className="flex flex-col gap-7 pb-4 animate-fade-in sm:gap-10 sm:pb-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">Metas</h1>
          <p className="text-[10px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest sm:tracking-normal sm:capitalize"> Acompanhe seus objetivos financeiros.</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => navigate("/metas/new")}
            className="h-11 items-center gap-2 rounded-[1.15rem] bg-gradient-to-br from-[#5B8CFF] to-[#2F67FF] px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_16px_36px_rgba(91,140,255,0.25)] transition-[transform,filter] hover:brightness-105 active:scale-95 shrink-0 sm:h-12 sm:px-6 sm:text-base sm:capitalize sm:tracking-normal"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Nova Meta</span>
            <span className="sm:hidden">Criar</span>
          </Button>
        )}
      </div>

      {isTableMissing ? (
        <Card className="premium-panel flex flex-col items-center gap-6 rounded-[1.75rem] border-2 border-dashed border-white/[0.08] bg-white/[0.03] p-8 text-center sm:rounded-[2rem] sm:p-10">
          <div className="h-16 w-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Plus className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Configuração Pendente</h2>
            <p className="text-sm text-muted-foreground max-w-sm font-medium">
              Para usar as metas, você precisa rodar o script de banco de dados (SQL) no seu painel do Supabase.
            </p>
          </div>
        </Card>
      ) : (goals && goals.length > 0) ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
          {isAdmin && <DashedAddCard label="Criar nova meta" onClick={() => navigate("/metas/new")} />}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <DashboardSection title="Em andamento" icon={Target}>
            {isAdmin ? (
              <DashedAddCard label="Criar sua primeira meta" onClick={() => navigate("/metas/new")} />
            ) : (
              <p className="text-muted-foreground font-bold text-sm col-span-full py-10">Nenhuma meta ativa no momento.</p>
            )}
          </DashboardSection>
        </div>
      )}

    </div>
  );
};

export default MetasPage;


