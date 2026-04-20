import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, Loader2, Trash2, CreditCard, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
}

interface CardOption {
  id: string;
  name: string;
  last_four?: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  category_id: string;
  payment_type?: "cash" | "credit_card" | null;
  card_id?: string | null;
  goal_id?: string | null;
}

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (deletedId?: string) => void;
  transaction: Transaction | null;
}

export const EditTransactionModal = ({ open, onClose, onSuccess, transaction }: EditTransactionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CardOption[]>([]);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [paymentType, setPaymentType] = useState<"cash" | "credit_card">("cash");
  const [cardId, setCardId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [allGoals, setAllGoals] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void fetchOptions();
  }, []);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || "");
      setAmount(transaction.amount.toString());
      setDate(format(new Date(transaction.date), "yyyy-MM-dd"));
      setCategoryId(transaction.category_id);
      setType(transaction.type);
      setPaymentType(transaction.payment_type === "credit_card" ? "credit_card" : "cash");
      setCardId(transaction.card_id || "");
      setGoalId(transaction.goal_id || "");
    }
  }, [transaction]);

  useEffect(() => {
    if (type !== "expense") {
      setPaymentType("cash");
      setCardId("");
    }
  }, [type]);

  useEffect(() => {
    if (paymentType !== "credit_card") {
      setCardId("");
    }
  }, [paymentType]);

  const fetchOptions = async () => {
    const [{ data: loadedCategories }, { data: loadedCards }, { data: loadedGoals }] = await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("cards").select("id, name, last_four").eq("is_active", true).order("name"),
      supabase.from("goals").select("id, name").eq("is_completed", false).order("name"),
    ]);

    if (loadedCategories) setCategories(loadedCategories);
    if (loadedCards) setCards(loadedCards);
    if (loadedGoals) setAllGoals(loadedGoals);
  };

  const handleSave = async () => {
    if (!transaction) return;
    if (type === "expense" && paymentType === "credit_card" && !cardId) {
      toast.error("Selecione um cartão para despesas no crédito.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase.from("transactions" as any) as any)
        .update({
          description,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          category_id: categoryId,
          type,
          payment_type: type === "expense" ? paymentType : null,
          card_id: type === "expense" && paymentType === "credit_card" ? cardId : null,
          goal_id: type === "income" && goalId ? goalId : null,
        })
        .eq("id", transaction.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");

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

  const handleDelete = async () => {
    if (!transaction) return;
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase.from("transactions" as any) as any).delete().eq("id", transaction.id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Acesso negado: Você não possui permissão para esta ação.");
      }

      toast.success("Transação excluída com sucesso.");
      onSuccess(transaction.id);
      onClose();
    } catch (err: any) {
      console.error("Erro crítico na exclusão:", err);
      toast.error(err.message || "Não foi possível excluir a transação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="border border-white/[0.05] bg-[#0C0C0E] p-6 text-white sm:max-w-md sm:p-10">
        <DialogHeader className="mb-6 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tighter text-white sm:text-3xl">Editar</DialogTitle>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ajuste os detalhes do seu lançamento</p>
          </div>
          {transaction && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Transação</Label>
            <div className="flex h-12 rounded-2xl border border-white/[0.05] bg-white/[0.03] p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setType("income")}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  type === "income" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-muted-foreground hover:text-white",
                )}
              >
                <ArrowUpCircle className="mr-2 h-3.5 w-3.5" /> Receita
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setType("expense")}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  type === "expense" ? "bg-white text-black shadow-xl" : "text-muted-foreground hover:text-white",
                )}
              >
                <ArrowDownCircle className="mr-2 h-3.5 w-3.5" /> Despesa
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descrição</Label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 font-black transition-all focus:border-primary/50"
              placeholder="Ex: Mercado mensal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">R$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-10 font-black transition-all focus:border-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 font-black transition-all focus:border-primary/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 font-black shadow-none transition-all focus:ring-primary/20">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] text-white shadow-3xl">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="my-1 rounded-xl text-xs font-black focus:bg-white/5">
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "income" && (
            <div className="space-y-2">
              <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Vincular a Meta</Label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Select value={goalId} onValueChange={setGoalId}>
                  <SelectTrigger className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-12 font-black shadow-none transition-all focus:ring-primary/20">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] text-white shadow-3xl">
                    {allGoals.length > 0 ? (
                      allGoals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id} className="my-1 rounded-xl text-xs font-black focus:bg-white/5">
                          {goal.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Nenhuma meta ativa encontrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "expense" && (
            <div className="space-y-2">
              <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Como foi essa despesa?</Label>
              <Select value={paymentType} onValueChange={(value: "cash" | "credit_card") => setPaymentType(value)}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 font-black shadow-none transition-all focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] text-white shadow-3xl">
                  <SelectItem value="cash" className="my-1 rounded-xl text-xs font-black focus:bg-white/5">
                    Dinheiro
                  </SelectItem>
                  <SelectItem value="credit_card" className="my-1 rounded-xl text-xs font-black focus:bg-white/5">
                    Cartão de crédito
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "expense" && paymentType === "credit_card" && (
            <div className="space-y-2">
              <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cartão</Label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-12 font-black shadow-none transition-all focus:ring-primary/20">
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] text-white shadow-3xl">
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id} className="my-1 rounded-xl text-xs font-black focus:bg-white/5">
                        {card.name}
                        {card.last_four ? ` •••• ${card.last_four}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="ghost"
              className="h-12 flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="h-12 flex-1 rounded-2xl bg-primary text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95"
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
