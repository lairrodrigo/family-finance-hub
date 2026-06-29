import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, BarChart3, ChevronDown, CircleDollarSign, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSettings } from "@/contexts/SettingsContext";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const COLORS = ["#6D5BFF", "#F59E0B", "#22C55E", "#38BDF8", "#EC4899", "#94A3B8", "#A78BFA"];

const parseDate = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00`);

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const compactCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const DiagnosticsPage = () => {
  const navigate = useNavigate();
  const { showValues } = useSettings();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const { data: transactions, isLoading } = useTransactions({ year: currentYear });

  const analytics = useMemo(() => {
    const expensesByMonth = Array.from({ length: 12 }, (_, index) => ({
      month: MONTH_LABELS[index],
      value: 0,
      isCurrent: index === currentMonth,
    }));

    const currentMonthExpenses = (transactions || []).filter((transaction) => {
      const date = parseDate(transaction.date);
      return transaction.type === "expense" && date.getMonth() === currentMonth;
    });

    const currentMonthIncome = (transactions || [])
      .filter((transaction) => {
        const date = parseDate(transaction.date);
        return transaction.type === "income" && date.getMonth() === currentMonth;
      })
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    (transactions || [])
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const date = parseDate(transaction.date);
        expensesByMonth[date.getMonth()].value += Number(transaction.amount);
      });

    const currentExpense = currentMonthExpenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const previousMonths = expensesByMonth.slice(0, currentMonth).filter((month) => month.value > 0);
    const averageExpense =
      previousMonths.length > 0
        ? previousMonths.reduce((sum, month) => sum + month.value, 0) / previousMonths.length
        : currentExpense;

    const variance =
      averageExpense > 0 ? Math.round(((currentExpense - averageExpense) / averageExpense) * 100) : 0;

    const categoryMap = new Map<string, { name: string; value: number; color: string }>();
    currentMonthExpenses.forEach((transaction) => {
      const name = transaction.categories?.name || "Outros";
      const existing = categoryMap.get(name);
      categoryMap.set(name, {
        name,
        value: (existing?.value || 0) + Number(transaction.amount),
        color: existing?.color || transaction.categories?.color || COLORS[categoryMap.size % COLORS.length],
      });
    });

    const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);
    const topCategory = categoryData[0];
    const balance = currentMonthIncome - currentExpense;

    return {
      currentExpense,
      currentMonthIncome,
      averageExpense,
      variance,
      balance,
      monthlyData: expensesByMonth.slice(Math.max(0, currentMonth - 4), currentMonth + 1),
      categoryData,
      topCategory,
    };
  }, [currentMonth, transactions]);

  const maskedCurrency = (value: number) => (showValues ? formatCurrency(value) : "R$ ••••");
  const categoryTotal = analytics.currentExpense || 1;
  const visibleCategories = showAllCategories ? analytics.categoryData : analytics.categoryData.slice(0, 6);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-8 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-xl shadow-primary/10">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="premium-label">Diagnóstico</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Análise financeira
          </h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-muted-foreground">
            Entenda para onde o dinheiro foi, compare com sua média e encontre os pontos que merecem atenção.
          </p>
        </div>

        <Button variant="outline" className="h-12 gap-2 rounded-2xl px-5 text-xs uppercase tracking-[0.18em]">
          Este mês <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-[1.5rem] bg-white/[0.05] lg:col-span-5" />
          <div className="h-80 animate-pulse rounded-[1.5rem] bg-white/[0.05] lg:col-span-7" />
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-12">
            <Card className="premium-light-card rounded-[1.5rem] p-6 text-[#0F172A] lg:col-span-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="primary-action flex h-10 w-10 items-center justify-center rounded-2xl">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-extrabold text-[#243047]">Você gastou</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                    analytics.variance > 0 ? "bg-[#F87171]/15 text-[#E11D48]" : "bg-[#22C55E]/15 text-[#15803D]",
                  )}
                >
                  {analytics.variance > 0 ? "Acima" : "Dentro"}
                </span>
              </div>

              <div className="mt-6">
                <p className="font-display text-4xl font-extrabold tracking-tight text-[#0F172A]">
                  {maskedCurrency(analytics.currentExpense)}
                </p>
                <p className={cn("mt-2 text-sm font-extrabold", analytics.variance > 0 ? "text-[#E11D48]" : "text-[#15803D]")}>
                  {Math.abs(analytics.variance)}% {analytics.variance > 0 ? "acima" : "abaixo"} da sua média
                </p>
              </div>

              <div className="mt-8 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#7B8798", fontSize: 10, fontWeight: 800 }} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(91,140,255,0.08)" }}
                      contentStyle={{ borderRadius: 16, border: "none", color: "#0F172A" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                      {analytics.monthlyData.map((entry) => (
                        <Cell key={entry.month} fill={entry.isCurrent ? "#6D5BFF" : "#D8E0FF"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/history")}
                className="mt-5 h-12 w-full justify-between rounded-2xl border-[#C8D4F4] bg-white/50 text-[#5B5BFF] hover:bg-white"
              >
                Ver análise completa <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>

            <Card className="premium-light-card rounded-[1.5rem] p-6 text-[#0F172A] lg:col-span-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6D5BFF]/10 text-[#6D5BFF]">
                    <PieChartIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-extrabold text-[#243047]">Para onde foi seu dinheiro?</h2>
                </div>
                <span className="text-xs font-extrabold text-[#7B8798]">Este mês</span>
              </div>

              <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
                <div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.categoryData} innerRadius={62} outerRadius={98} paddingAngle={3} dataKey="value">
                          {analytics.categoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-extrabold text-[#7B8798]">Total gasto</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">{maskedCurrency(analytics.currentExpense)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analytics.categoryData.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#C8D4F4] bg-white/40 p-6 text-center">
                      <p className="text-sm font-extrabold text-[#65738A]">Sem gastos no mês para analisar.</p>
                    </div>
                  ) : (
                    visibleCategories.map((category) => {
                      const percentage = Math.round((category.value / categoryTotal) * 100);
                      return (
                        <div key={category.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                            <span className="truncate text-sm font-extrabold text-[#243047]">{category.name}</span>
                          </div>
                          <span className="text-sm font-extrabold text-[#243047]">{showValues ? compactCurrency(category.value) : "R$ ••••"}</span>
                          <span className="w-10 text-right text-xs font-extrabold text-[#7B8798]">{percentage}%</span>
                        </div>
                      );
                    })
                  )}

                  {analytics.categoryData.length > 6 && (
                    <Button
                      variant="outline"
                      type="button"
                      aria-expanded={showAllCategories}
                      onClick={() => setShowAllCategories((current) => !current)}
                      className="mt-5 h-11 rounded-2xl border-[#C8D4F4] bg-white/50 px-5 text-xs font-extrabold text-[#243047] hover:bg-white"
                    >
                      {showAllCategories ? "Ver menos categorias" : "Ver todas as categorias"}
                      <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showAllCategories && "rotate-180")} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="premium-panel rounded-[1.5rem] p-6">
              <CircleDollarSign className="mb-5 h-8 w-8 text-primary" />
              <p className="premium-label">Entradas</p>
              <p className="mt-3 font-display text-2xl font-extrabold text-white">{maskedCurrency(analytics.currentMonthIncome)}</p>
            </Card>

            <Card className="premium-panel rounded-[1.5rem] p-6">
              <BarChart3 className="mb-5 h-8 w-8 text-[#FBBF24]" />
              <p className="premium-label">Média mensal</p>
              <p className="mt-3 font-display text-2xl font-extrabold text-white">{maskedCurrency(analytics.averageExpense)}</p>
            </Card>

            <Card className="premium-panel rounded-[1.5rem] p-6">
              <TrendingUp className={cn("mb-5 h-8 w-8", analytics.balance >= 0 ? "text-[#22C55E]" : "text-[#F87171]")} />
              <p className="premium-label">Saldo do mês</p>
              <p className={cn("mt-3 font-display text-2xl font-extrabold", analytics.balance >= 0 ? "text-white" : "text-[#FF8D8D]")}>
                {maskedCurrency(analytics.balance)}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DiagnosticsPage;
