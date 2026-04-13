export interface Insight {
  title: string;
  description: string;
  type: 'danger' | 'success' | 'info';
  iconName: string;
}

export const generateInsights = (transactions: any[], categories: any[]): Insight[] => {
  if (transactions.length < 3) return [];

  const insights: Insight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Filtrar transações por mês (esse vs anterior)
  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === lastM && d.getFullYear() === lastY;
  });

  // 2. Análise de Categoria Principal (Mês Atual)
  const categoryExpenses: Record<string, number> = {};
  currentMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    const cat = categories.find(c => c.id === t.category_id)?.name || "Outros";
    categoryExpenses[cat] = (categoryExpenses[cat] || 0) + Number(t.amount);
  });

  const sortedCategories = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const [topCat, amount] = sortedCategories[0];
    insights.push({
      title: "Gasto Dominante",
      description: `Sua maior fonte de despesa este mês é "${topCat}", com um total de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      type: 'info',
      iconName: 'PieChart'
    });
  }

  // 3. Comparação Mensal (Tendência)
  const currentTotalExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const lastTotalExpense = lastMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  if (lastTotalExpense > 0) {
    const diff = ((currentTotalExpense - lastTotalExpense) / lastTotalExpense) * 100;
    if (diff > 10) {
      insights.push({
        title: "Alerta de Tendência",
        description: `Seus gastos subiram ${Math.abs(Math.round(diff))}% em relação ao mês passado. Tente revisar suas despesas variáveis.`,
        type: 'danger',
        iconName: 'TrendingUp'
      });
    } else if (diff < -10) {
      insights.push({
        title: "Bom Trabalho!",
        description: `Você economizou ${Math.abs(Math.round(diff))}% este mês em comparação ao anterior. Continue assim!`,
        type: 'success',
        iconName: 'ArrowDown'
      });
    }
  }

  // 4. Balanço Receita x Despesa
  const currentTotalIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  if (currentTotalIncome > 0 && currentTotalExpense > 0) {
    const ratio = (currentTotalExpense / currentTotalIncome) * 100;
    if (ratio > 90) {
      insights.push({
        title: "Margem Apertada",
        description: `Sua despesa já compromete ${Math.round(ratio)}% da sua receita este mês. Atenção com novos gastos!`,
        type: 'danger',
        iconName: 'AlertTriangle'
      });
    } else if (ratio < 60) {
      insights.push({
        title: "Fluxo Saudável",
        description: `Excelente! Você está gastando apenas ${Math.round(ratio)}% do que ganha. Ótimo momento para investir ou poupar.`,
        type: 'success',
        iconName: 'Target'
      });
    }
  }

  return insights;
};
