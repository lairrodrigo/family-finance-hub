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
      <Card className="p-6 border-none shadow-md bg-card/50 backdrop-blur-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{goal.name}</h3>
              <p className="text-xs text-muted-foreground">{goal.category || "Sem categoria"}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2 bg-primary/10" />
          <div className="flex justify-between text-[11px] font-medium">
            <span className="text-muted-foreground">{formattedCurrent}</span>
            <span className="text-foreground">{formattedTarget}</span>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 px-4 pt-4 pb-20 animate-fade-in md:pt-0">
        <div className="animate-pulse space-y-4">
          <div className="h-20 w-1/3 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle Missing Table (404) or No Family
  const isTableMissing = (error as any)?.code === "PGRST116" || (error as any)?.message?.includes("not found");
  
  return (
    <div className="flex flex-col gap-8 px-4 pt-4 pb-20 animate-fade-in md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Metas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie seus objetivos financeiros e acompanhe seu progresso.
          </p>
        </div>
        <Button 
          onClick={() => navigate("/metas/new")}
          className="hidden md:flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          <Plus className="h-5 w-5" />
          Nova Meta
        </Button>
      </div>

      {isTableMissing ? (
        <Card className="p-8 border-dashed border-2 bg-muted/30 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Plus className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Configuração Pendente</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
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
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 active:scale-90 transition-transform md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default MetasPage;
