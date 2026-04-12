import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  category_id: string;
}

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: Transaction | null;
}

export const EditTransactionModal = ({ open, onClose, onSuccess, transaction }: EditTransactionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || "");
      setAmount(transaction.amount.toString());
      setDate(format(new Date(transaction.date), 'yyyy-MM-dd'));
      setCategoryId(transaction.category_id);
      setType(transaction.type);
    }
  }, [transaction]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleSave = async () => {
    if (!transaction) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          description,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          category_id: categoryId,
          type
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success("Transação atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar transação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl bg-background p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold font-display">Editar Transação</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
            <div className="flex bg-muted/50 rounded-2xl p-1 h-12">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setType('income')}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-bold transition-all",
                  type === 'income' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                )}
              >
                <ArrowUpCircle className="h-3 w-3 mr-1" /> Entrada
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setType('expense')}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-bold transition-all",
                  type === 'expense' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <ArrowDownCircle className="h-3 w-3 mr-1" /> Saída
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descrição</Label>
            <Input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 rounded-2xl bg-muted/50 border-none px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ex: Mercado mensal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Valor</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <Input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 pl-10 rounded-2xl bg-muted/50 border-none text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Data</Label>
              <Input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-2xl bg-muted/50 border-none px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-none shadow-none text-sm font-bold px-4 focus:ring-primary/20">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-xl">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold text-muted-foreground" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 h-12 rounded-2xl font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white" 
              onClick={handleSave}
              disabled={loading || !description || !amount}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
