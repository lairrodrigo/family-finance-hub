export interface Insight {
  id: string;
  title: string;
  description: string;
  type: "danger" | "warning" | "success" | "info";
  iconName: string;
  priority: 1 | 2 | 3;
}

interface TransactionLike {
  amount: number | string;
  category_id?: string | null;
  date: string;
  type: string;
}

interface CategoryLike {
  id: string;
  name: string;
}

export interface SpendingGuideCard {
  availableToSpend: number;
  remainingBalance: number;
  totalIncome: number;
  totalExpense: number;
  state: "safe" | "warning" | "over";
  title: string;
  description: string;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toDate = (value: string) => {
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized);
};

const sumAmounts = (transactions: TransactionLike[]) =>
  transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

const getCurrentMonthTransactions = (transactions: TransactionLike[]) => {
  const now = new Date();
  return transactions.filter((transaction) => {
    const date = toDate(transaction.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
};

const getPreviousMonthTransactions = (transactions: TransactionLike[]) => {
  const now = new Date();
  const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  return transactions.filter((transaction) => {
    const date = toDate(transaction.date);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });
};

export const calculateSpendingGuide = (transactions: TransactionLike[]): SpendingGuideCard => {
  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const incomeTransactions = currentMonthTransactions.filter((transaction) => transaction.type === "income");
  const expenseTransactions = currentMonthTransactions.filter((transaction) => transaction.type === "expense");

  const totalIncome = sumAmounts(incomeTransactions);
  const totalExpense = sumAmounts(expenseTransactions);
  const remainingBalance = totalIncome - totalExpense;
  const availableToSpend = Math.max(remainingBalance * 0.8, 0);

  if (remainingBalance < 0) {
    return {
      availableToSpend,
      remainingBalance,
      totalIncome,
      totalExpense,
      state: "over",
      title: "Quanto você ainda pode gastar",
      description: `Você ultrapassou seu limite em ${formatCurrency(Math.abs(remainingBalance))}. Hora de segurar os gastos.`,
    };
  }

  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 0;
  if (expenseRatio >= 0.8) {
    return {
      availableToSpend,
      remainingBalance,
      totalIncome,
      totalExpense,
      state: "warning",
      title: "Quanto você ainda pode gastar",
      description: "Você está perto do limite mensal. Pegue leve nos próximos gastos.",
    };
  }

  return {
    availableToSpend,
    remainingBalance,
    totalIncome,
    totalExpense,
    state: "safe",
    title: "Quanto você ainda pode gastar",
    description: `Você ainda pode gastar ${formatCurrency(availableToSpend)} este mês com tranquilidade.`,
  };
};

export const generateInsights = (transactions: TransactionLike[], categories: CategoryLike[]): Insight[] => {
  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const previousMonthTransactions = getPreviousMonthTransactions(transactions);
  const expenseTransactions = currentMonthTransactions.filter((transaction) => transaction.type === "expense");
  const incomeTransactions = currentMonthTransactions.filter((transaction) => transaction.type === "income");

  if (currentMonthTransactions.length === 0) {
    return [];
  }

  const now = new Date();
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(totalDaysInMonth - currentDay, 1);

  const totalIncome = sumAmounts(incomeTransactions);
  const totalExpense = sumAmounts(expenseTransactions);
  const averageDailySpend = currentDay > 0 ? totalExpense / currentDay : 0;

  const todayExpenses = expenseTransactions.filter((transaction) => {
    const date = toDate(transaction.date);
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });
  const todayExpenseTotal = sumAmounts(todayExpenses);

  const categoryTotals = expenseTransactions.reduce<Record<string, number>>((accumulator, transaction) => {
    const categoryName = categories.find((category) => category.id === transaction.category_id)?.name || "Outros";
    accumulator[categoryName] = (accumulator[categoryName] || 0) + Number(transaction.amount || 0);
    return accumulator;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  const projectedExpense = averageDailySpend * totalDaysInMonth;
  const projectedOverrun = Math.max(projectedExpense - totalIncome, 0);
  const spentIncomeRatio = totalIncome > 0 ? totalExpense / totalIncome : 0;
  const dailyRunRateRatio = averageDailySpend > 0 ? todayExpenseTotal / averageDailySpend : 0;

  const previousExpenseTotal = sumAmounts(
    previousMonthTransactions.filter((transaction) => transaction.type === "expense"),
  );

  const streakMap = todayExpenses.reduce<Record<string, number>>((accumulator, transaction) => {
    const categoryName = categories.find((category) => category.id === transaction.category_id)?.name || "Outros";
    accumulator[categoryName] = (accumulator[categoryName] || 0) + 1;
    return accumulator;
  }, {});

  const repeatedCategoryToday = Object.entries(streakMap)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])[0];

  const insights: Insight[] = [];

  if (totalIncome > 0 && projectedExpense > totalIncome) {
    insights.push({
      id: "projection-risk",
      title: "Risco no ritmo atual",
      description: `Se continuar assim, você deve passar ${formatCurrency(projectedOverrun)} do que ganha neste mês.`,
      type: "danger",
      iconName: "AlertTriangle",
      priority: 1,
    });
  }

  if (totalIncome > 0 && currentDay <= Math.ceil(totalDaysInMonth / 2) && spentIncomeRatio >= 0.7) {
    insights.push({
      id: "early-burn",
      title: "Gasto acelerado",
      description: `Você já gastou ${Math.round(spentIncomeRatio * 100)}% da sua renda antes da metade do mês.`,
      type: "danger",
      iconName: "TrendingUp",
      priority: 1,
    });
  }

  if (todayExpenseTotal > 0 && dailyRunRateRatio >= 1.35) {
    insights.push({
      id: "daily-behavior",
      title: "Hoje pesou mais",
      description: `Hoje você já gastou ${formatCurrency(todayExpenseTotal)}. Está acima da sua média diária.`,
      type: "warning",
      iconName: "TrendingUp",
      priority: 2,
    });
  }

  if (repeatedCategoryToday) {
    insights.push({
      id: "repeat-category",
      title: "Alerta de hábito",
      description: `Você fez ${repeatedCategoryToday[1]} gastos seguidos em ${repeatedCategoryToday[0]} hoje.`,
      type: "warning",
      iconName: "Target",
      priority: 2,
    });
  }

  if (topCategory && topCategory[1] > 0) {
    insights.push({
      id: "dominant-category",
      title: "Categoria dominante",
      description: `${topCategory[0]} é sua maior despesa neste mês (${formatCurrency(topCategory[1])}).`,
      type: "info",
      iconName: "PieChart",
      priority: 3,
    });
  }

  if (previousExpenseTotal > 0 && totalExpense < previousExpenseTotal * 0.85) {
    insights.push({
      id: "saving-trend",
      title: "Bom controle",
      description: "Você está gastando menos que o normal. Bom controle financeiro.",
      type: "success",
      iconName: "ArrowDown",
      priority: 3,
    });
  }

  if (
    totalIncome > 0 &&
    totalExpense > 0 &&
    projectedExpense <= totalIncome &&
    spentIncomeRatio <= 0.6 &&
    currentHour >= 12
  ) {
    insights.push({
      id: "healthy-rhythm",
      title: "Ritmo sob controle",
      description: `Seu mês está equilibrado. Ainda sobra espaço para os próximos ${daysRemaining} dias.`,
      type: "success",
      iconName: "Target",
      priority: 3,
    });
  }

  const uniqueInsights = insights.filter(
    (insight, index, allInsights) => allInsights.findIndex((candidate) => candidate.id === insight.id) === index,
  );

  return uniqueInsights.sort((a, b) => a.priority - b.priority).slice(0, 5);
};
