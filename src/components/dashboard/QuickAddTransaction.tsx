import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, ArrowUp, ArrowDown, Tag, Mic, Paperclip, Loader2 } from "lucide-react";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";

interface QuickAddTransactionProps {
  onSuccess?: () => void;
}

export const QuickAddTransaction = ({ onSuccess }: QuickAddTransactionProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, type]);

  const fetchCategories = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      const familyId = profile?.family_id;
      if (!familyId) return;

      const { data: cats, error } = await supabase
        .from("categories")
        .select("*")
        .or(`family_id.eq.${familyId},is_default.eq.true`)
        .eq("type", type);
      
      if (error) {
        console.error("Erro ao buscar categorias:", error);
      }
      
      const loadedCats = cats || [];
      setCategories(loadedCats);
      
      // Reset categoryId if current selection is not in the new list
      if (categoryId && loadedCats.length > 0 && !loadedCats.find(c => c.id === categoryId)) {
        setCategoryId("");
      }
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  };

  const handleAmountChange = (val: string) => {
    // Allow digits, one comma or dot as decimal separator
    const cleaned = val.replace(/[^0-9.,]/g, "");
    setAmount(cleaned);
    if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
  };

  const parseAmount = (val: string): number => {
    if (!val || val.trim() === "") return NaN;
    // Replace comma with dot for parseFloat
    const normalized = val.replace(/\./g, "").replace(",", ".");
    // If no comma was present, try direct parse (user may use dot as decimal)
    if (!val.includes(",")) {
      return parseFloat(val.replace(/[^0-9.]/g, ""));
    }
    return parseFloat(normalized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseAmount(amount);
    
    const newErrors: { amount?: string; category?: string } = {};
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Informe um valor válido";
    }
    
    if (!categoryId || categoryId.trim() === "") {
      newErrors.category = "Selecione uma categoria";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});

    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      
      if (!profile?.family_id) {
        toast.error("Família não encontrada. Configure seu perfil primeiro.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("transactions" as any).insert([{
        family_id: profile.family_id,
        user_id: user?.id,
        amount: parsedAmount,
        type,
        description: description || "",
        category_id: categoryId,
        date: new Date().toISOString().split("T")[0]
      }]);

      if (error) throw error;

      toast.success("Transação registrada com sucesso!");
      setAmount("");
      setDescription("");
      setCategoryId("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar transação:", err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Lançamento Rápido</h3>
          <div className="flex items-center gap-1 ml-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-white/20 hover:text-primary hover:bg-primary/5 transition-all"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-white/20 hover:text-primary hover:bg-primary/5 transition-all"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex bg-white/[0.03] rounded-full p-1">
          <button 
            onClick={() => setType("expense")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
              type === "expense" ? "bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "text-white/20 hover:text-white/40"
            )}
          >
            Despesa
          </button>
          <button 
            onClick={() => setType("income")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
              type === "income" ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "text-white/20 hover:text-white/40"
            )}
          >
            Receita
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Amount field */}
          <div className="flex-1 space-y-1">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-30">R$</span>
              <Input 
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={cn(
                  "pl-12 h-14 rounded-2xl bg-white/[0.02] border text-xl font-bold tracking-tight focus:border-primary/30 transition-all placeholder:text-white/5",
                  errors.amount ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]"
                )}
              />
            </div>
            {errors.amount && <p className="text-[10px] font-bold text-red-400 ml-4 uppercase tracking-wider">{errors.amount}</p>}
          </div>

          {/* Description field */}
          <div className="flex-[1.5] space-y-2">
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10" />
              <Input 
                placeholder="Descrição (ex: Almoço)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] font-medium placeholder:text-white/5"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Category Selector */}
          <div className="flex-1 w-full space-y-1">
            <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); if (errors.category) setErrors(prev => ({ ...prev, category: undefined })); }}>
              <SelectTrigger className={cn(
                "h-14 rounded-2xl bg-white/[0.02] border pl-4",
                errors.category ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]"
              )}>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] shadow-3xl">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-xl my-1 focus:bg-white/5 transition-colors">
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-white/30 font-medium">Nenhuma categoria encontrada</p>
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-[10px] font-bold text-red-400 ml-4 uppercase tracking-wider">{errors.category}</p>}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading}
            className={cn(
              "h-14 px-8 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 shrink-0 w-full md:w-auto",
              type === 'expense' ? 'bg-white text-black hover:bg-white/90' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
            )}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Lançar</>}
          </Button>
        </div>
      </form>

      <ImportHistoryModal 
        open={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        onSuccess={() => {
          if (onSuccess) onSuccess();
          setIsAIModalOpen(false);
        }} 
      />
    </Card>
  );
};
