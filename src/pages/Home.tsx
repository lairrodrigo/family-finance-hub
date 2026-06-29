import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Eye, EyeOff, Loader2, Lock, Plus, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConversationalInput } from "@/components/dashboard/ConversationalInput";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { QuickAddTransaction } from "@/components/dashboard/QuickAddTransaction";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useGoals } from "@/hooks/useGoals";
import { usePermissions } from "@/hooks/usePermissions";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

const HomeGoalsSection = () => {
  const { goals, isLoading } = useGoals();
  const navigate = useNavigate();
  const displayGoals = goals?.slice(0, 2) || [];

  if (isLoading) return <div className="h-24 animate-pulse rounded-[1.5rem] bg-white/[0.06]" />;

  if (displayGoals.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate("/metas/new")}
        className="premium-panel-hover flex w-full cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-white/[0.10] bg-white/[0.03] p-6 text-center"
      >
        <Target className="mb-3 h-7 w-7 text-primary" />
        <span className="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          Defina sua primeira meta financeira
        </span>
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      {displayGoals.map((goal) => {
        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
        return (
          <Card key={goal.id} className="premium-panel-hover rounded-[1.35rem] border-white/[0.08] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-extrabold text-white">{goal.name}</span>
              <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </Card>
        );
      })}
    </div>
  );
};

const NoFamilyBanner = () => {
  const navigate = useNavigate();
  return (
    <Card className="premium-panel flex animate-in flex-col items-center justify-between gap-6 rounded-[1.5rem] border-primary/20 p-6 duration-700 fade-in slide-in-from-top-4 sm:flex-row">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className="primary-action flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
          <Plus className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">Crie seu Espaço Familiar</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Para começar a lançar gastos, você precisa de um workspace.
          </p>
        </div>
      </div>
      <Button onClick={() => navigate("/family")} className="h-12 whitespace-nowrap px-8 text-xs uppercase tracking-[0.18em]">
        Configurar agora
      </Button>
    </Card>
  );
};

interface AccountSummary {
  label: string;
  suffix: "PF" | "PJ";
  income: number;
  expense: number;
  balance: number;
}

const AccountSummaryCard = ({
  summary,
  variant,
  showValues,
  formatCurrency,
}: {
  summary: AccountSummary;
  variant: "pf" | "pj";
  showValues: boolean;
  formatCurrency: (value: number) => string;
}) => {
  const Icon = variant === "pf" ? UserRound : Building2;
  const isNegative = summary.balance < 0;

  return (
    <Card
      className={cn(
        "premium-panel-hover relative min-h-[132px] min-w-0 overflow-hidden rounded-[1.25rem] p-3 shadow-[0_18px_45px_rgba(2,6,23,0.24)] sm:min-h-[150px] sm:rounded-[1.5rem] sm:p-5",
        variant === "pf"
          ? "border-blue-300/25 bg-gradient-to-br from-[#24488C] via-[#1D376B] to-[#172946]"
          : "border-emerald-300/25 bg-gradient-to-br from-[#0C6B59] via-[#0F5348] to-[#173A35]",
      )}
    >
      <Icon className="absolute right-3 top-3 h-14 w-14 text-white/[0.045] sm:right-4 sm:top-4 sm:h-16 sm:w-16" />

      <div className="relative flex h-full min-w-0 flex-col justify-between gap-5 sm:gap-6">
        <div>
          <p className="text-[7.5px] font-black uppercase tracking-[0.18em] text-white sm:text-[10px] sm:tracking-[0.24em]">
            {summary.label} <span className="ml-1 text-white/45">{summary.suffix}</span>
          </p>
          <p
            className={cn(
              "mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-display text-[clamp(1.05rem,4.7vw,1.6rem)] font-extrabold leading-none tracking-[-0.06em] sm:mt-4 sm:text-3xl",
              isNegative ? "text-[#FF8D8D]" : "text-white",
            )}
          >
            {showValues ? formatCurrency(summary.balance) : "R$ ••••"}
          </p>
        </div>

        <div className="relative grid gap-1.5 text-[8px] font-extrabold sm:text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-emerald-300">ENTRADAS</span>
            <span className="whitespace-nowrap text-right text-white">{showValues ? formatCurrency(summary.income) : "R$ ••••"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#F87171]">SAÍDAS</span>
            <span className="whitespace-nowrap text-right text-[#FF8D8D]">{showValues ? formatCurrency(summary.expense) : "R$ ••••"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const HomePage = () => {
  const { showValues, toggleShowValues } = useSettings();
  const { familyId, profileLoading } = useAuth();
  const { isAdmin, canCreateTransaction } = usePermissions();
  const navigate = useNavigate();

  const { data: fullTransactions, isLoading: txsLoading, refetch: refetchTransactions } = useTransactions();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  const loading = txsLoading || catsLoading || accountsLoading;

  const { totals, balance } = useMemo(() => {
    const income = (fullTransactions || [])
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = (fullTransactions || [])
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totals: { income, expense },
      balance: income - expense,
    };
  }, [fullTransactions]);

  const accountSummaries = useMemo(() => {
    const safeAccounts = accounts || [];
    const pfAccount = safeAccounts.find((account) => account.name.toLowerCase() === "pessoa pf");
    const pjAccount = safeAccounts.find((account) => account.name.toLowerCase() === "empresa pj");

    const summaries: Record<"pf" | "pj", AccountSummary> = {
      pf: { label: "Pessoa", suffix: "PF", income: 0, expense: 0, balance: 0 },
      pj: { label: "Empresa", suffix: "PJ", income: 0, expense: 0, balance: 0 },
    };

    (fullTransactions || []).forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;
      const bucket = transaction.account_id === pjAccount?.id ? summaries.pj : summaries.pf;

      if (transaction.type === "income") {
        bucket.income += amount;
      } else {
        bucket.expense += amount;
      }
    });

    summaries.pf.balance = summaries.pf.income - summaries.pf.expense;
    summaries.pj.balance = summaries.pj.income - summaries.pj.expense;

    return summaries;
  }, [accounts, fullTransactions]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col gap-8 pb-8 animate-fade-in">
        <DashboardHeader />
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 pb-4 animate-fade-in sm:gap-7 sm:pb-8 xl:max-w-none">
      <DashboardHeader />

      {!familyId && !profileLoading && <NoFamilyBanner />}

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
        <div className="flex flex-col gap-7 lg:col-span-8">
          <Card className="premium-light-card relative overflow-hidden rounded-[1.5rem] p-5 text-[#0F172A] sm:p-6 md:rounded-[2rem] md:p-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#2F67FF]">Saldo disponível</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShowValues}
                className="h-9 w-9 min-w-0 rounded-full text-[#172033] hover:bg-[#EAF1FF] hover:text-[#0F172A]"
              >
                {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-5 flex items-baseline gap-3 overflow-hidden md:mt-6">
              <span className="text-2xl font-extrabold text-[#65738A] sm:text-3xl">R$</span>
              <p className="font-display truncate break-all text-5xl font-extrabold tracking-tighter text-[#0F172A] sm:text-6xl md:text-7xl lg:text-7xl">
                {showValues ? balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "••••••"}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mt-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#172033] shadow-inner sm:h-12 sm:w-12">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7B8798]">Comprometido</span>
                  <span className="text-base font-extrabold text-[#0F172A] sm:text-lg">{showValues ? formatCurrency(0) : "R$ ••••"}</span>
                </div>
              </div>

              <Button onClick={() => navigate("/history")} className="h-10 px-7 text-xs sm:h-11 sm:text-sm">
                Detalhes
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="premium-label">Por conta</p>
              <Button
                variant="ghost"
                className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary hover:bg-primary/10"
                onClick={() => navigate("/transactions")}
              >
                Extrato <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
              <AccountSummaryCard
                summary={accountSummaries.pf}
                variant="pf"
                showValues={showValues}
                formatCurrency={formatCurrency}
              />
              <AccountSummaryCard
                summary={accountSummaries.pj}
                variant="pj"
                showValues={showValues}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>

          {canCreateTransaction && <ConversationalInput onSuccess={() => refetchTransactions()} />}

          {canCreateTransaction && <QuickAddTransaction onSuccess={() => refetchTransactions()} />}

        </div>

        <div className="flex flex-col gap-7 lg:col-span-4">
          <div className="space-y-4">
            <h2 className="premium-label px-1">Divvy IA</h2>
            <InsightsSection transactions={fullTransactions} categories={categories} isLoading={loading} />
          </div>

          <div className="premium-panel space-y-6 rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-white">Metas Ativas</h2>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
                  onClick={() => navigate("/metas")}
                >
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
