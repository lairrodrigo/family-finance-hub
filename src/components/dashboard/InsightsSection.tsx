import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, AlertTriangle, PieChart, Target, ArrowDown, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateInsights, Insight } from "@/lib/utils/financeAnalyzer";
import { cn } from "@/lib/utils";

const IconMap: Record<string, any> = {
  PieChart,
  TrendingUp,
  ArrowDown,
  Target,
  AlertTriangle,
};

interface InsightsSectionProps {
  transactions: any[];
  categories: any[];
  isLoading?: boolean;
}

export const InsightsSection = ({ transactions, categories, isLoading }: InsightsSectionProps) => {
  const insights = generateInsights(transactions, categories);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-white/[0.02] rounded-[2.5rem] border border-white/[0.05] flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-white/10 animate-spin" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="relative p-7 border border-white/[0.05] bg-gradient-to-br from-[#0C0C0E] to-[#050505] rounded-[2.5rem] overflow-hidden group shadow-2xl">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-[60px] rounded-full" />
        <div className="flex gap-5">
          <div className="h-14 w-14 rounded-2xl bg-[#121212] flex items-center justify-center shrink-0 border border-white/[0.03]">
            <Brain className="h-7 w-7 text-white/10" />
          </div>
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">Aguardando Dados</p>
            <p className="text-sm text-white/20 leading-relaxed font-medium">
              Adicione pelo menos 3 transações para que a IA possa analisar seu perfil financeiro.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => {
        const Icon = IconMap[insight.iconName] || Sparkles;
        
        return (
          <Card 
            key={idx} 
            className={cn(
              "relative p-7 border border-white/[0.05] bg-gradient-to-br from-[#0C0C0E] to-[#050505] rounded-[2.5rem] overflow-hidden group shadow-2xl transition-all duration-500 hover:border-white/10",
              insight.type === 'danger' && "border-red-500/10 shadow-red-500/5",
              insight.type === 'success' && "border-green-500/10 shadow-green-500/5"
            )}
          >
            {/* Glow accent */}
            <div className={cn(
              "absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700",
              insight.type === 'danger' ? "bg-red-500/10" : insight.type === 'success' ? "bg-green-500/10" : "bg-primary/10"
            )} />
            
            <div className="flex gap-5">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.03] shadow-inner",
                insight.type === 'danger' ? "bg-red-500/5 text-red-400" : 
                insight.type === 'success' ? "bg-green-500/5 text-green-400" : 
                "bg-[#121212] text-primary"
              )}>
                <Icon className="h-7 w-7" />
              </div>
              
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.25em]",
                    insight.type === 'danger' ? "text-red-400" : insight.type === 'success' ? "text-green-400" : "text-primary"
                  )}>
                    {insight.title}
                  </p>
                  <Badge variant="outline" className="text-[8px] h-4 py-0 border-white/5 text-white/20">IA</Badge>
                </div>
                <p className="text-sm text-white/60 leading-relaxed font-medium tracking-wide">
                  {insight.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
