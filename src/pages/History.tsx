import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
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
  Clock,
  Plus,
  ArrowRight,
  ChevronDown,
  Trash2,
  Edit2
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ICON_MAP: Record<string, any> = {
  'utensils': Utensils,
  'car': Car,
  'home': HomeIcon,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  'shirt': Shirt,
  'repeat': Repeat,
  'shopping-bag': ShoppingBag,
  'ellipsis': Ellipsis,
  'banknote': Banknote,
  'laptop': Laptop,
  'trending-up': TrendingUp,
};

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedView, setSelectedView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const years = [2024, 2025, 2026];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchCategories()
      ]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do histórico.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const fetchTransactions = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories:category_id (name, icon, color)
        `)
        .eq("family_id", profile.family_id)
        .order("date", { ascending: false });

      if (error) throw error;

      const formatted = data.map((t: any) => ({
        ...t,
        category_name: t.categories?.name || 'Sem categoria',
        category_icon: t.categories?.icon || 'ellipsis',
        category_color: t.categories?.color || '#C0C0C0'
      }));

      setTransactions(formatted);
    } catch (err: any) {
      console.error("Transactions fetch error:", err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    
    try {
      console.log("Iniciando exclusão da transação (Histórico):", id);
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .select();

      console.log("Resposta Supabase (Delete Histórico):", { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("A exclusão foi bloqueada pelo banco de dados.");
      }
      
      // Opção 1 — Atualização local (Remover o item do estado atual)
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Transação excluída com sucesso.");
    } catch (err: any) {
      console.error("Erro crítico na exclusão do Histórico:", err);
      toast.error(err.message || "Não foi possível excluir a transação.");
    }
  };

  // Filtering Logic
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const matchesYear = transactionDate.getFullYear() === selectedYear;
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category_id === selectedCategory;
    
    return matchesYear && matchesSearch && matchesCategory;
  });

  // Grouping Logic
  const groupedTransactions: Record<string, { transactions: Transaction[], totalIncome: number, totalExpense: number }> = {};

  filteredTransactions.forEach(t => {
    const date = new Date(t.date);
    const dateKey = selectedView === 'monthly' 
      ? date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : date.getFullYear().toString();
    
    const capitalizedKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);

    if (!groupedTransactions[capitalizedKey]) {
      groupedTransactions[capitalizedKey] = { transactions: [], totalIncome: 0, totalExpense: 0 };
    }

    groupedTransactions[capitalizedKey].transactions.push(t);
    if (t.type === 'income') groupedTransactions[capitalizedKey].totalIncome += Number(t.amount);
    else groupedTransactions[capitalizedKey].totalExpense += Number(t.amount);
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-32">
      <div className="flex flex-col gap-8 px-4 pt-4 md:pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="md:hidden -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-white">Histórico</h1>
          </div>
          <Button 
            onClick={() => setIsImportModalOpen(true)} 
            className="rounded-full bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5 font-bold text-[10px] uppercase tracking-widest px-6 h-10 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" /> Importar planilha
          </Button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar-hide">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "h-11 px-8 rounded-2xl text-sm font-bold transition-all shrink-0",
                selectedYear === year 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "bg-white/[0.02] text-white/30 border border-white/[0.05] hover:text-white/60 hover:bg-white/[0.05]"
              )}
            >
              {year}
            </button>
          ))}
        </div>

        <Tabs defaultValue="visualize" className="w-full">
          <TabsList className="bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl h-12 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="visualize" className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary transition-all">
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary transition-all">
              Excluir
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualize" className="mt-0">
            <div className="flex flex-col md:flex-row gap-4 items-center mb-8 px-4 md:px-0">
              <div className="flex items-center p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl w-fit">
                <button 
                  onClick={() => setSelectedView('monthly')}
                  className={cn(
                    "h-9 px-6 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                    selectedView === 'monthly' ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Mensal
                </button>
                <button 
                  onClick={() => setSelectedView('annual')}
                  className={cn(
                    "h-9 px-6 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                    selectedView === 'annual' ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Anual
                </button>
              </div>

              <div className="flex flex-1 flex-col md:flex-row gap-4 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10" />
                  <Input 
                    placeholder="Buscar transação..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-none text-sm font-bold placeholder:text-white/5 focus-visible:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <div className="w-full md:w-64">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-none text-sm font-bold px-6 focus:ring-primary/20">
                      <SelectValue placeholder="Todas Categorias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-white/[0.05] bg-[#0C0C0E] shadow-2xl text-white">
                      <SelectItem value="all" className="rounded-xl focus:bg-white/5">Todas Categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-xl focus:bg-white/5">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8 px-4 md:px-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
                  <p className="text-sm text-white/30 font-bold uppercase tracking-widest">Carregando histórico...</p>
                </div>
              ) : Object.keys(groupedTransactions).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
                  <div className="h-24 w-24 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/5">
                    <Calendar className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white/80">Nenhuma transação encontrada</h3>
                    <p className="text-sm text-white/20 max-w-xs mx-auto font-medium">
                      Tente ajustar seus filtros ou adicione novas transações.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  {Object.entries(groupedTransactions).map(([period, data]) => (
                    <div key={period} className="space-y-6">
                      <div className="flex items-end justify-between px-2 text-white">
                        <h2 className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">{period}</h2>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-[#22C55E]/40 uppercase tracking-wider mb-0.5">Ganhos</span>
                            <span className="text-sm font-bold text-[#22C55E]">{formatCurrency(data.totalIncome)}</span>
                          </div>
                          <div className="flex flex-col items-end border-l border-white/5 pl-6">
                            <span className="text-[10px] font-bold text-[#EF4444]/40 uppercase tracking-wider mb-0.5">Gastos</span>
                            <span className="text-sm font-bold text-[#EF4444]">{formatCurrency(data.totalExpense)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {data.transactions.map((t) => {
                          const Icon = ICON_MAP[t.category_icon || 'ellipsis'] || Ellipsis;
                          return (
                            <Card key={t.id} className="p-5 border border-white/[0.05] bg-[#0C0C0E] hover:bg-[#121214] transition-all rounded-[2.5rem] group shadow-xl border-none">
                              <div className="flex items-center gap-5">
                                <div 
                                  className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xl shadow-black/40"
                                  style={{ backgroundColor: `${t.category_color}10`, color: t.category_color }}
                                >
                                  <Icon className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-base text-white truncate pr-2">{t.description || t.category_name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-white/10" />
                                    <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                                      {t.category_name}
                                    </span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "flex flex-col items-end gap-1 font-bold text-lg tracking-tight",
                                  t.type === 'income' ? "text-[#22C55E]" : "text-white"
                                )}>
                                  <div className="flex items-center gap-1">
                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                                  </div>
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
          </TabsContent>

          <TabsContent value="manage" className="mt-0 px-4 md:px-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
                <p className="text-sm text-white/30 font-bold uppercase tracking-widest">Carregando...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/5">
                  <Trash2 className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white/80">Nada para excluir</h3>
                  <p className="text-sm text-white/20 max-w-xs mx-auto font-medium">
                    Sua lista de transações para este período está vazia.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTransactions.map((t) => {
                  const Icon = ICON_MAP[t.category_icon || 'ellipsis'] || Ellipsis;
                  return (
                    <Card key={t.id} className="p-4 border border-white/[0.05] bg-[#0C0C0E] rounded-[2rem] flex items-center justify-between group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.03]" style={{ color: t.category_color }}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{t.description || t.category_name}</h4>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{formatCurrency(Number(t.amount))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-colors"
                          onClick={() => {
                            setSelectedTransaction(t);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-colors"
                          onClick={() => handleDeleteTransaction(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ImportHistoryModal 
        open={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchData}
      />

      <EditTransactionModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(deletedId) => {
          if (deletedId) {
            setTransactions(prev => prev.filter(t => t.id !== deletedId));
          }
          fetchTransactions();
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default HistoryPage;
