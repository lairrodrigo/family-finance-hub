import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowDown, Loader2, PieChart, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import { calculateSpendingGuide, generateInsights, type Insight } from "@/lib/utils/financeAnalyzer";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  AlertTriangle,
  ArrowDown,
  PieChart,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
};

interface InsightsSectionProps {
  transactions: any[];
  categories: any[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SpendingGuideCard = ({
  amount,
  state,
}: {
  amount: number;
  state: "safe" | "warning" | "over";
}) => (
  <Card
    className={cn(
      "relative overflow-hidden rounded-[1.5rem] border p-7 shadow-2xl",
      state === "safe" && "border-emerald-500/20 bg-gradient-to-br from-[#0D5C4B] via-[#133E37] to-[#182233]",
      state === "warning" && "border-amber-500/20 bg-gradient-to-br from-[#6B4E16] via-[#3E321A] to-[#182233]",
      state === "over" && "border-red-500/20 bg-gradient-to-br from-[#5F1F2A] via-[#352033] to-[#182233]",
    )}
  >
    <div
      className={cn(
        "absolute -right-10 -top-10 h-36 w-36 rounded-full blur-[70px]",
        state === "safe" && "bg-emerald-400/10",
        state === "warning" && "bg-amber-400/10",
        state === "over" && "bg-red-400/10",
      )}
    />

    <div className="relative space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
        Quanto você ainda pode gastar este mês
      </p>

      <div className="space-y-1">
        <p
          className={cn(
            "text-4xl font-black tracking-tight",
            state === "safe" && "text-emerald-300",
            state === "warning" && "text-amber-300",
            state === "over" && "text-red-300",
          )}
        >
          {formatCurrency(Math.abs(amount))}
        </p>
        <p
          className={cn(
            "text-sm font-medium",
            state === "safe" && "text-emerald-200/85",
            state === "warning" && "text-amber-200/85",
            state === "over" && "text-red-200/85",
          )}
        >
          {state === "safe" && "Seu mês segue sob controle."}
          {state === "warning" && "Vale desacelerar um pouco nos próximos gastos."}
          {state === "over" && "Agora é hora de segurar até fechar o mês."}
        </p>
      </div>
    </div>
  </Card>
);

const InsightMiniCard = ({ insight }: { insight: Insight }) => {
  const Icon = iconMap[insight.iconName] || Sparkles;

  return (
    <Card
      className={cn(
        "premium-panel-hover rounded-[1.35rem] border bg-[#182233]/85 p-5 shadow-xl transition-all",
        insight.type === "danger" && "border-red-500/10",
        insight.type === "warning" && "border-amber-500/10",
        insight.type === "success" && "border-emerald-500/10",
        insight.type === "info" && "border-white/[0.05]",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.04]",
            insight.type === "danger" && "bg-red-500/10 text-red-400",
            insight.type === "warning" && "bg-amber-500/10 text-amber-400",
            insight.type === "success" && "bg-emerald-500/10 text-emerald-400",
            insight.type === "info" && "bg-white/[0.03] text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">{insight.title}</p>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">{insight.description}</p>
        </div>
      </div>
    </Card>
  );
};

export const InsightsSection = ({ transactions, categories, isLoading }: InsightsSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex h-44 items-center justify-center rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const safeTransactions = transactions || [];
  const safeCategories = categories || [];

  const spendingGuide = calculateSpendingGuide(safeTransactions);
  const insights = generateInsights(safeTransactions, safeCategories);

  return (
    <div className="space-y-4">
      <SpendingGuideCard
        amount={spendingGuide.state === "over" ? spendingGuide.remainingBalance : spendingGuide.availableToSpend}
        state={spendingGuide.state}
      />

      <div className="premium-panel space-y-4 rounded-[1.5rem] p-5">
        <div className="px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Fique ligado</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Sinais rápidos do que mais importa agora.</p>
        </div>

        {insights.length === 0 ? (
          <Card className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] p-5">
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              Assim que você movimentar mais o mês, eu começo a destacar o que merece atenção.
            </p>
          </Card>
        ) : (
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {insights.map((insight) => (
              <InsightMiniCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
