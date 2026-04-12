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
  ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
        .order("date", { ascending: false })
        .limit(20);

      if (error) throw error;

      const formatted = data.map((t: any) => ({
        ...t,
        category_name: t.categories?.name || 'Sem categoria',
        category_icon: t.categories?.icon || 'ellipsis',
        category_color: t.categories?.color || '#C0C0C0'
      }));

      setTransactions(formatted);
    } catch (err: any) {
      toast.error("Erro ao carregar transações: " + err.message);
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

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-32">
      <div className="flex flex-col gap-4 px-4 pt-4 md:pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-2xl font-bold">Atividades</h1>
          </div>
          <Button onClick={() => navigate("/add")} size="sm" className="rounded-full">
            Registrar
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que você procura?" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-none shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-2">
          <ListFilter className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 px-4">
          {filteredTransactions.map((t) => {
            const Icon = ICON_MAP[t.category_icon || 'ellipsis'] || Ellipsis;
            return (
              <Card key={t.id} className="p-4 border-none bg-card shadow-sm hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${t.category_color}15`, color: t.category_color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{t.description || t.category_name}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {t.category_name}
                    </p>
                  </div>
                  <div className={cn(
                    "font-bold text-sm",
                    t.type === 'income' ? "text-success" : "text-foreground"
                  )}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                  </div>
                </div>
              </Card>
            );
          })}
          <Button 
            variant="ghost" 
            className="mt-4 text-xs font-bold text-primary hover:bg-primary/5 uppercase tracking-widest"
            onClick={() => navigate("/history")}
          >
            Ver histórico completo
          </Button>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
