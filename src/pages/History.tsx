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
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const years = [2025, 2026, 2027];

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
      {/* Header Section */}
      <div className="flex flex-col gap-8 px-4 pt-4 md:pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="md:hidden -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight">Histórico</h1>
          </div>
          <Button 
            onClick={() => setIsImportModalOpen(true)} 
            className="rounded-full bg-primary/20 text-primary hover:bg-primary/30 border-none shadow-none font-bold text-xs px-6 h-10"
          >
            <Plus className="h-4 w-4 mr-2" /> Importar planilha
          </Button>
        </div>

        {/* Year Selectors */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar-hide">
          {years.map(year => (
            <Button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "h-11 px-8 rounded-2xl text-sm font-bold transition-all border-none",
                selectedYear === year 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {year}
            </Button>
          ))}
        </div>

        {/* Monthly/Yearly Toggle */}
        <div className="flex items-center p-1 bg-muted/50 rounded-2xl w-fit">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedView('monthly')}
            className={cn(
              "h-9 px-6 rounded-xl text-xs font-bold transition-all",
              selectedView === 'monthly' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Mensal
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedView('annual')}
            className={cn(
              "h-9 px-6 rounded-xl text-xs font-bold transition-all",
              selectedView === 'annual' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Anual
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-muted/50 border-none shadow-none text-sm font-medium focus-visible:ring-primary/20"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-14 rounded-2xl bg-muted/50 border-none shadow-none text-sm font-medium px-6 focus:ring-primary/20">
                <SelectValue placeholder="Todas Categorias" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="rounded-xl">Todas Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-xl">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-8 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
            <p className="text-sm text-muted-foreground font-medium">Carregando histórico...</p>
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
            <div className="h-24 w-24 rounded-[40px] bg-muted/30 flex items-center justify-center text-muted-foreground/20">
              <Calendar className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground/80">Nenhuma transação em {selectedYear}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Adicione receitas e despesas para acompanhar suas finanças de forma organizada.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedTransactions).map(([period, data]) => (
              <div key={period} className="space-y-6">
                <div className="flex items-end justify-between px-2">
                  <h2 className="text-sm font-black text-foreground/40 uppercase tracking-widest">{period}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-success/60 uppercase tracking-tighter">Ganhos</span>
                      <span className="text-xs font-black text-success tracking-tight">{formatCurrency(data.totalIncome)}</span>
                    </div>
                    <div className="flex flex-col items-end border-l border-white/5 pl-4">
                      <span className="text-[10px] font-bold text-destructive/60 uppercase tracking-tighter">Gastos</span>
                      <span className="text-xs font-black text-destructive tracking-tight">{formatCurrency(data.totalExpense)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {data.transactions.map((t) => {
                    const Icon = ICON_MAP[t.category_icon || 'ellipsis'] || Ellipsis;
                    return (
                      <Card key={t.id} className="p-5 border-none bg-muted/20 hover:bg-muted/30 transition-all rounded-[24px] group">
                        <div className="flex items-center gap-5">
                          <div 
                            className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                            style={{ backgroundColor: `${t.category_color}15`, color: t.category_color }}
                          >
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base truncate pr-2">{t.description || t.category_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                                {t.category_name}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "flex flex-col items-end gap-1 font-black text-lg",
                            t.type === 'income' ? "text-success" : "text-foreground"
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

      <ImportHistoryModal 
        open={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchData}
      />
    </div>
  );
};

export default HistoryPage;
