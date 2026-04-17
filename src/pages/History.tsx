import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Calendar,
  Utensils,
  Car,
  Home as HomeIcon,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  Shirt,
  Repeat,
  ShoppingBag,
  Ellipsis,
  Banknote,
  Laptop,
  TrendingUp,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit2,
  Download,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

const ICON_MAP: Record<string, any> = {
  utensils: Utensils,
  car: Car,
  home: HomeIcon,
  "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  shirt: Shirt,
  repeat: Repeat,
  "shopping-bag": ShoppingBag,
  ellipsis: Ellipsis,
  banknote: Banknote,
  laptop: Laptop,
  "trending-up": TrendingUp,
};

interface Transaction {
  id: string;
  amount: number;
  card_id?: string | null;
  card_last_four?: string | null;
  card_name?: string | null;
  type: "income" | "expense";
  description: string;
  date: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  payment_type?: "cash" | "credit_card" | null;
  user_id: string;
}

interface GroupedPeriod {
  label: string;
  month?: number;
  year: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
}

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const AVAILABLE_YEARS = [2024, 2025, 2026];

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEditTransaction, canCreateTransaction } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedView, setSelectedView] = useState<"monthly" | "annual">("monthly");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user) {
      void fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchCategories(), fetchProfiles()]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do histórico.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    if (data) setCategories(data);
  };

  const fetchProfiles = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("family_id", profile.family_id);

      if (error) throw error;

      const mappedProfiles = (data || []).reduce<Record<string, ProfileSummary>>((accumulator, item) => {
        accumulator[item.user_id] = item;
        return accumulator;
      }, {});

      setProfiles(mappedProfiles);
    } catch (err) {
      console.error("Profiles fetch error:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          categories:category_id (name, icon, color)
        `,
        )
        .eq("family_id", profile.family_id)
        .order("date", { ascending: false });

      if (error) throw error;

      const cardIds = Array.from(
        new Set((data || []).map((transaction: any) => transaction.card_id).filter(Boolean)),
      ) as string[];

      let cardsById: Record<string, { name: string | null; last_four: string | null }> = {};

      if (cardIds.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
          .from("cards")
          .select("id, name, last_four")
          .eq("family_id", profile.family_id)
          .in("id", cardIds);

        if (cardsError) throw cardsError;

        cardsById = (cardsData || []).reduce<Record<string, { name: string | null; last_four: string | null }>>(
          (accumulator, card) => {
            accumulator[card.id] = {
              name: card.name || null,
              last_four: card.last_four || null,
            };
            return accumulator;
          },
          {},
        );
      }

      const formatted = (data || []).map((transaction: any) => ({
        ...transaction,
        card_last_four: transaction.card_id ? cardsById[transaction.card_id]?.last_four || null : null,
        card_name: transaction.card_id ? cardsById[transaction.card_id]?.name || null : null,
        category_name: transaction.categories?.name || "Sem categoria",
        category_icon: transaction.categories?.icon || "ellipsis",
        category_color: transaction.categories?.color || "#C0C0C0",
      }));

      setTransactions(formatted);
    } catch (err: any) {
      console.error("Transactions fetch error:", err);
    }
  };

  const handleDeleteTransaction = async (id: string, ownerId: string) => {
    if (!canEditTransaction(ownerId)) {
      toast.error("Você não tem permissão para excluir esta transação.");
      return;
    }

    const transaction = transactions.find((item) => item.id === id);
    const transactionLabel = transaction?.description || transaction?.category_name || "esta transação";
    if (!window.confirm(`Excluir "${transactionLabel}"? Essa ação não pode ser desfeita.`)) return;

    try {
      const { data, error } = await supabase.from("transactions").delete().eq("id", id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Acesso negado: você não possui permissão para esta ação.");
      }

      setTransactions((current) => current.filter((transactionItem) => transactionItem.id !== id));
      toast.success("Transação excluída.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    }
  };

  const handleDeletePeriod = async (period: GroupedPeriod, mode: "month" | "year") => {
    const periodTransactions = period.transactions.filter((transaction) => canEditTransaction(transaction.user_id));

    if (periodTransactions.length === 0) {
      toast.error("Você não tem permissão para excluir transações deste período.");
      return;
    }

    const ids = periodTransactions.map((transaction) => transaction.id);
    const periodLabel = mode === "month" ? `o mês de ${period.label}` : `o ano de ${period.year}`;
    const confirmMessage = `Excluir ${ids.length} transaç${ids.length === 1 ? "ão" : "ões"} de ${periodLabel}? Essa limpeza afeta saldo, histórico e relatórios.`;

    if (!window.confirm(confirmMessage)) return;

    setBulkDeleting(true);
    try {
      const { data, error } = await supabase.from("transactions").delete().in("id", ids).select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Acesso negado: você não possui permissão para esta ação.");
      }

      const deletedIds = new Set(data.map((item) => item.id));
      setTransactions((current) => current.filter((transaction) => !deletedIds.has(transaction.id)));
      toast.success(`${data.length} transaç${data.length === 1 ? "ão removida" : "ões removidas"} com sucesso.`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir período.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        const matchesYear = transactionDate.getFullYear() === selectedYear;
        const matchesSearch =
          transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || transaction.category_id === selectedCategory;

        return matchesYear && matchesSearch && matchesCategory;
      }),
    [transactions, selectedYear, searchTerm, selectedCategory],
  );

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, GroupedPeriod>();

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = selectedView === "monthly" ? `${year}-${month}` : `${year}`;
      const label =
        selectedView === "monthly"
          ? date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
          : year.toString();
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!groups.has(key)) {
        groups.set(key, {
          label: capitalizedLabel,
          month,
          year,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
        });
      }

      const group = groups.get(key)!;
      group.transactions.push(transaction);

      if (transaction.type === "income") group.totalIncome += Number(transaction.amount);
      else group.totalExpense += Number(transaction.amount);
    });

    return Array.from(groups.values());
  }, [filteredTransactions, selectedView]);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const currentExportPeriod = useMemo(() => {
    if (selectedView === "annual") {
      return {
        label: String(selectedYear),
        year: selectedYear,
        transactions: filteredTransactions,
        totalIncome: filteredTransactions
          .filter((transaction) => transaction.type === "income")
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        totalExpense: filteredTransactions
          .filter((transaction) => transaction.type === "expense")
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      } satisfies GroupedPeriod;
    }

    return groupedTransactions[0] ?? null;
  }, [selectedView, selectedYear, filteredTransactions, groupedTransactions]);

  const escapeCsvCell = (value: string | number | null | undefined) => {
    const normalized = String(value ?? "");
    if (normalized.includes('"') || normalized.includes(",") || normalized.includes("\n")) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const getPeriodExportFileName = (period: GroupedPeriod, mode: "month" | "year") => {
    if (mode === "month") {
      const month = String((period.month ?? 0) + 1).padStart(2, "0");
      return `divvy-financeiro-${period.year}-${month}.csv`;
    }
    return `divvy-financeiro-${period.year}.csv`;
  };

  const downloadCsvFile = (fileName: string, csvContent: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPeriod = (period: GroupedPeriod, mode: "month" | "year") => {
    const exportableTransactions = period.transactions;

    if (exportableTransactions.length === 0) {
      toast.error("Não há transações para exportar neste período.");
      return;
    }

    const header = [
      "data",
      "tipo",
      "descricao",
      "categoria",
      "valor",
      "forma_de_pagamento",
      "cartao",
      "criado_por",
    ];

    const rows = exportableTransactions.map((transaction) => {
      const createdBy = profiles[transaction.user_id]?.full_name || profiles[transaction.user_id]?.email || transaction.user_id;

      return [
        escapeCsvCell(new Date(transaction.date).toLocaleDateString("pt-BR")),
        escapeCsvCell(transaction.type === "income" ? "receita" : "despesa"),
        escapeCsvCell(transaction.description || ""),
        escapeCsvCell(transaction.category_name || "Sem categoria"),
        escapeCsvCell(Number(transaction.amount).toFixed(2).replace(".", ",")),
        escapeCsvCell(
          transaction.type === "expense"
            ? transaction.payment_type === "credit_card"
              ? "Cartão de crédito"
              : "Dinheiro"
            : "",
        ),
        escapeCsvCell(
          transaction.payment_type === "credit_card" && transaction.card_name
            ? `${transaction.card_name}${transaction.card_last_four ? ` •••• ${transaction.card_last_four}` : ""}`
            : "",
        ),
        escapeCsvCell(createdBy),
      ].join(",");
    });

    downloadCsvFile(getPeriodExportFileName(period, mode), [header.join(","), ...rows].join("\n"));
    toast.success(`Exportação de ${mode === "month" ? "mês" : "ano"} iniciada.`);
  };

  const handleTopExport = () => {
    if (!currentExportPeriod) {
      toast.error("Não há dados visíveis para exportar.");
      return;
    }

    handleExportPeriod(currentExportPeriod, selectedView === "monthly" ? "month" : "year");
  };

  return (
    <div className="flex flex-col gap-8 pb-8 animate-fade-in">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="lg:hidden -ml-2 h-10 w-10 rounded-xl border border-white/[0.05] bg-white/[0.03]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">Histórico</h1>
          </div>

          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-3">
              {canCreateTransaction && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="group relative flex h-12 flex-1 items-center justify-center rounded-2xl bg-white px-6 font-black uppercase tracking-widest text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.03] active:scale-[0.97] sm:h-14 sm:flex-none sm:px-8"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="text-[10px] sm:text-[11px]">Importar</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleTopExport}
                className={cn(
                  "group flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/[0.08] active:scale-[0.97] sm:h-14 sm:flex-none sm:px-8",
                  !canCreateTransaction && "w-full",
                )}
              >
                <Download className="mr-2 h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
                <span className="text-[10px] sm:text-[11px]">Exportar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar-hide flex items-center gap-3 overflow-x-auto pb-2">
          {AVAILABLE_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "h-11 shrink-0 rounded-2xl px-8 text-sm font-bold transition-all",
                selectedYear === year
                  ? "scale-105 bg-primary text-white shadow-lg shadow-primary/20"
                  : "border border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-muted-foreground",
              )}
            >
              {year}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-4">
          <div className="flex w-full items-center rounded-2xl border border-white/[0.05] bg-white/[0.02] p-1 sm:w-fit">
            <button
              onClick={() => setSelectedView("monthly")}
              className={cn(
                "h-10 flex-1 rounded-xl px-6 text-[10px] font-bold uppercase tracking-wider transition-all sm:flex-none",
                selectedView === "monthly"
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setSelectedView("annual")}
              className={cn(
                "h-10 flex-1 rounded-xl px-6 text-[10px] font-bold uppercase tracking-wider transition-all sm:flex-none",
                selectedView === "annual"
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Anual
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-14 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-12 text-sm font-bold shadow-none transition-all placeholder:text-white/5 focus-visible:ring-primary/20"
              />
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-14 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-6 text-sm font-bold shadow-none">
                  <SelectValue placeholder="Todas Categorias" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-white/[0.05] bg-[#0C0C0E] text-white shadow-2xl">
                  <SelectItem value="all" className="rounded-xl focus:bg-white/5">
                    Todas Categorias
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="rounded-xl focus:bg-white/5">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : groupedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-white/[0.05] bg-white/[0.02] text-white/5">
                <Calendar className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white/80">Nenhuma transação encontrada</h3>
            </div>
          ) : (
            <div className="space-y-12">
              {groupedTransactions.map((period) => (
                <div key={`${period.year}-${period.month ?? "annual"}`} className="space-y-6">
                  <div className="flex items-end justify-between gap-4 px-2 text-white">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">{period.label}</h2>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={bulkDeleting}
                            className="h-9 w-9 rounded-xl border border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-white"
                          >
                            {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-2xl border-white/[0.05] bg-[#0C0C0E] text-white">
                          {selectedView === "monthly" && (
                            <DropdownMenuItem
                              className="rounded-xl text-sm font-medium focus:bg-white/[0.05]"
                              onClick={() => void handleDeletePeriod(period, "month")}
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-red-400" />
                              Excluir transações do mês
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/[0.05]" />
                          <DropdownMenuItem
                            className="rounded-xl text-sm font-medium focus:bg-white/[0.05]"
                            onClick={() => void handleDeletePeriod(period, "year")}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-red-400" />
                            Excluir transações do ano
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]/40">Ganhos</span>
                        <span className="text-sm font-bold text-[#22C55E]">{formatCurrency(period.totalIncome)}</span>
                      </div>
                      <div className="flex flex-col items-end border-l border-white/5 pl-6">
                        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EF4444]/40">Gastos</span>
                        <span className="text-sm font-bold text-[#EF4444]">{formatCurrency(period.totalExpense)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {period.transactions.map((transaction) => {
                      const Icon = ICON_MAP[transaction.category_icon || "ellipsis"] || Ellipsis;
                      const canEdit = canEditTransaction(transaction.user_id);

                      return (
                        <Card
                          key={transaction.id}
                          className="group rounded-[1.75rem] border-none bg-[#0C0C0E] p-4 shadow-xl transition-all hover:bg-[#121214] sm:rounded-[2.5rem] sm:p-5"
                        >
                          <div className="flex items-center gap-4 sm:gap-5">
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-2xl shadow-black/40 sm:h-14 sm:w-14 sm:rounded-2xl"
                              style={{ backgroundColor: `${transaction.category_color}10`, color: transaction.category_color }}
                            >
                              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="truncate pr-2 text-sm font-bold text-white sm:text-base">
                                {transaction.description || transaction.category_name}
                              </h4>
                              <div className="mt-0.5 flex items-center gap-2 sm:mt-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                                  {new Date(transaction.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-white/10" />
                                <span className="truncate text-[9px] font-bold uppercase tracking-widest text-primary/40 sm:text-[10px]">
                                  {transaction.category_name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex shrink-0 flex-col items-end gap-1 text-base font-black tracking-tight sm:text-lg",
                                  transaction.type === "income" ? "text-[#22C55E]" : "text-white",
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  {transaction.type === "income" ? "+" : "-"} {formatCurrency(Number(transaction.amount))}
                                </div>
                              </div>

                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl border border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-white"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-2xl border-white/[0.05] bg-[#0C0C0E] text-white">
                                    <DropdownMenuItem
                                      className="rounded-xl text-sm font-medium focus:bg-white/[0.05]"
                                      onClick={() => {
                                        setSelectedTransaction(transaction);
                                        setIsEditModalOpen(true);
                                      }}
                                    >
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      Editar transação
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="rounded-xl text-sm font-medium text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                      onClick={() => void handleDeleteTransaction(transaction.id, transaction.user_id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir transação
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImportHistoryModal open={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchData} />
      <EditTransactionModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(deletedId) => {
          if (deletedId) {
            setTransactions((current) => current.filter((transaction) => transaction.id !== deletedId));
          } else {
            void fetchTransactions();
          }
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default HistoryPage;
