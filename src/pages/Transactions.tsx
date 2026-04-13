import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
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
  ListFilter,
  ArrowLeftRight,
  ChevronLeft,
  Plus,
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
import { EditTransactionModal } from "@/components/EditTransactionModal";

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

const TransactionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    
    try {
      console.log("Iniciando exclusão da transação (Extrato):", id);
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .select();

      console.log("Resposta Supabase (Delete Extrato):", { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("A exclusão foi bloqueada pelo banco de dados.");
      }
      
      // Opção 1 — Atualização local (Remover o item do estado atual)
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Transação excluída com sucesso.");
    } catch (err: any) {
      console.error("Erro crítico na exclusão do Extrato:", err);
      toast.error(err.message || "Não foi possível excluir a transação.");
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-8 max-w-2xl mx-auto lg:mx-0">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">Atividades</h1>
              <p className="text-sm font-medium text-white/20">Fluxo recente de caixa</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/add")} 
            className="h-12 px-6 rounded-2xl bg-white text-black font-bold hover:bg-white/90 shadow-xl shadow-white/5 transition-all active:scale-95"
          >
            Lançar
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="O que você procura?" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-16 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] text-white font-bold placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <Loader2 className="h-10 w-10 animate-spin text-white/10" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 px-10 text-center gap-6 border-2 border-dashed rounded-[3rem] border-white/5 bg-white/[0.01]">
          <div className="h-24 w-24 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/5">
            <ListFilter className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white/80">Nada por aqui</h3>
            <p className="text-sm text-white/20 max-w-xs mx-auto font-medium">
              Sua lista de atividades recentes está limpa.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((t) => {
            const Icon = ICON_MAP[t.category_icon || 'ellipsis'] || Ellipsis;
            return (
              <div 
                key={t.id} 
                className="p-6 rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl transition-all hover:bg-[#121214] hover:border-white/[0.1] group relative overflow-hidden flex items-center justify-between"
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div 
                  className="flex items-center gap-5 relative z-10 flex-1 cursor-pointer"
                  onClick={() => {
                    setSelectedTransaction(t);
                    setIsEditModalOpen(true);
                  }}
                >
                  <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.03] shadow-xl transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${t.category_color}10`, color: t.category_color }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-white truncate tracking-tight">{t.description || t.category_name}</h4>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] mt-0.5">
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {t.category_name}
                    </p>
                  </div>
                  <div className={cn(
                    "font-bold text-xl tracking-tight mr-4",
                    t.type === 'income' ? "text-[#22C55E]" : "text-white"
                  )}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-20">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-2xl hover:bg-red-500/10 text-white/10 hover:text-red-500 transition-colors"
                    onClick={() => handleDeleteTransaction(t.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          <Button 
            variant="ghost" 
            className="mt-8 h-14 rounded-2xl text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-[0.3em] hover:bg-white/[0.02] transition-all"
            onClick={() => navigate("/history")}
          >
            Ver histórico completo
          </Button>
        </div>
      )}

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

export default TransactionsPage;
