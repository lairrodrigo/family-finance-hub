import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Tag, Mic, Paperclip, Loader2, CreditCard } from "lucide-react";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";

interface QuickAddTransactionProps {
  onSuccess?: () => void;
}

export const QuickAddTransaction = ({ onSuccess }: QuickAddTransactionProps) => {
  const { user, familyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit_card">("cash");
  const [cardId, setCardId] = useState<string>("");
  const [errors, setErrors] = useState<{ amount?: string; category?: string; cardId?: string }>({});

  useEffect(() => {
    if (user && familyId) {
      void fetchData(familyId);
    }
  }, [user, familyId, type]);

  useEffect(() => {
    if (type !== "expense") {
      setPaymentType("cash");
      setCardId("");
      setErrors((prev) => ({ ...prev, cardId: undefined }));
    }
  }, [type]);

  useEffect(() => {
    if (paymentType !== "credit_card") {
      setCardId("");
      setErrors((prev) => ({ ...prev, cardId: undefined }));
    }
  }, [paymentType]);

  const fetchData = async (currentFamilyId: string) => {
    try {
      console.log("QuickAddTransaction: Fetching data for family", currentFamilyId);
      
      const { data: loadedCategories, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .or(`family_id.eq.${currentFamilyId},is_default.eq.true`)
        .eq("type", type);

      if (categoriesError) {
        console.error("QuickAddTransaction: Erro ao buscar categorias:", categoriesError);
      }

      const nextCategories = loadedCategories || [];
      setCategories(nextCategories);
      if (categoryId && !nextCategories.find((category) => category.id === categoryId)) {
        setCategoryId("");
      }

      const { data: loadedCards, error: cardsError } = await supabase
        .from("cards")
        .select("id, name, last_four")
        .eq("family_id", currentFamilyId)
        .eq("is_active", true)
        .order("name");

      if (cardsError) {
        console.error("QuickAddTransaction: Erro ao buscar cartoes:", cardsError);
      }

      setCards(loadedCards || []);
    } catch (err) {
      console.error("QuickAddTransaction: Erro ao buscar dados:", err);
    }
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.,]/g, "");
    setAmount(cleaned);
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const parseAmount = (value: string): number => {
    if (!value || value.trim() === "") return NaN;
    const normalized = value.replace(/\./g, "").replace(",", ".");
    if (!value.includes(",")) {
      return parseFloat(value.replace(/[^0-9.]/g, ""));
    }
    return parseFloat(normalized);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = parseAmount(amount);
    const nextErrors: { amount?: string; category?: string; cardId?: string } = {};

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = "Informe um valor válido";
    }

    if (!categoryId) {
      nextErrors.category = "Selecione uma categoria";
    }

    if (type === "expense" && paymentType === "credit_card" && !cardId) {
      nextErrors.cardId = "Selecione um cartão";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!familyId) {
      toast.error("Família não encontrada. Aguarde o carregamento ou configure seu perfil.");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("transactions" as any)
        .insert([
          {
            family_id: familyId,
            user_id: user?.id,
            created_by: user?.id,
            amount: parsedAmount,
            type,
            description: description || "",
            category_id: categoryId,
            payment_type: type === "expense" ? paymentType : null,
            card_id: type === "expense" && paymentType === "credit_card" ? cardId : null,
            date: new Date().toISOString().split("T")[0],
          },
        ])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");

      toast.success("Transação registrada com sucesso!");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setPaymentType("cash");
      setCardId("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("QuickAddTransaction: Erro ao salvar transação:", err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-in zoom-in-95 rounded-[2rem] border border-white/[0.05] bg-[#0C0C0E] p-6 shadow-2xl duration-500 sm:rounded-[2.5rem] sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground sm:text-[10px]">Lançamento Rápido</h3>
          <div className="ml-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 rounded-full bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all sm:px-4",
              type === "expense"
                ? "bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all sm:px-4",
              type === "income"
                ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            Receita
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 space-y-1">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-30">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                className={cn(
                  "h-12 rounded-2xl border bg-white/[0.02] pl-12 text-lg font-black tracking-tight transition-all placeholder:text-white/5 focus:border-primary/30 sm:h-14 sm:text-xl",
                  errors.amount ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]",
                )}
              />
            </div>
            {errors.amount && <p className="ml-4 text-[10px] font-black uppercase tracking-wider text-red-400">{errors.amount}</p>}
          </div>

          <div className="flex-[1.5] space-y-2">
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Descrição (ex: Almoço)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-12 text-sm font-black placeholder:text-white/5 sm:h-14"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full flex-1 space-y-1">
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-12 rounded-2xl border bg-white/[0.02] pl-4 font-black transition-all sm:h-14",
                  errors.category ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]",
                )}
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] shadow-3xl">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="my-1 rounded-xl font-black transition-colors focus:bg-white/5">
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs font-medium text-muted-foreground">Nenhuma categoria encontrada</p>
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.category && <p className="ml-4 text-[10px] font-black uppercase tracking-wider text-red-400">{errors.category}</p>}
          </div>

          {type === "expense" && (
            <div className="w-full flex-1 space-y-1">
              <Select value={paymentType} onValueChange={(value: "cash" | "credit_card") => setPaymentType(value)}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/[0.05] bg-white/[0.02] pl-4 font-black transition-all sm:h-14">
                  <SelectValue placeholder="Como foi essa despesa?" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] shadow-3xl">
                  <SelectItem value="cash" className="my-1 rounded-xl font-black transition-colors focus:bg-white/5">
                    Dinheiro
                  </SelectItem>
                  <SelectItem value="credit_card" className="my-1 rounded-xl font-black transition-colors focus:bg-white/5">
                    Cartão de crédito
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "h-12 w-full shrink-0 rounded-2xl px-8 text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 md:w-auto sm:h-14",
              type === "expense"
                ? "bg-red-500/10 text-white shadow-[0_0_15px_rgba(239,68,68,0.12)] hover:bg-red-500/20"
                : "bg-primary/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.12)] hover:bg-primary/20",
            )}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Lançar</>}
          </Button>
        </div>

        {type === "expense" && paymentType === "credit_card" && (
          <div className="space-y-1">
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={cardId}
                onValueChange={(value) => {
                  setCardId(value);
                  if (errors.cardId) setErrors((prev) => ({ ...prev, cardId: undefined }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-12 rounded-2xl border bg-white/[0.02] pl-12 font-black transition-all sm:h-14",
                    errors.cardId ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]",
                  )}
                >
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/5 bg-[#0C0C0E] shadow-3xl">
                  {cards.length > 0 ? (
                    cards.map((card) => (
                      <SelectItem key={card.id} value={card.id} className="my-1 rounded-xl font-black transition-colors focus:bg-white/5">
                        {card.name}
                        {card.last_four ? ` •••• ${card.last_four}` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs font-medium text-muted-foreground">Nenhum cartão ativo encontrado</p>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            {errors.cardId && <p className="ml-4 text-[10px] font-black uppercase tracking-wider text-red-400">{errors.cardId}</p>}
          </div>
        )}
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
