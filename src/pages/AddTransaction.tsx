import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Tag,
  Calendar as CalendarIcon,
  Loader2,
  Mic,
  Paperclip,
  Square,
  ChevronLeft,
  Banknote,
  LayoutGrid,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { SmartImportEngine } from "@/services/smartImportEngine";
import { usePermissions } from "@/hooks/usePermissions";

const AddTransactionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateTransaction, isViewer } = usePermissions();

  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [smartSource, setSmartSource] = useState<"audio" | "image" | "pdf" | null>(null);
  const [lastSmartData, setLastSmartData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit_card">("cash");
  const [cardId, setCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<{ amount?: string; category?: string; cardId?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && isViewer) {
      toast.error("Visualizadores não podem criar transações.");
      navigate("/");
    }
  }, [user, isViewer, navigate]);

  useEffect(() => {
    if (user && !isViewer) {
      void fetchData();
    }
  }, [user, isViewer, type]);

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

  const fetchData = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      const familyId = profile?.family_id;

      if (!familyId) {
        toast.error("Você precisa estar em uma família para adicionar transações.");
        navigate("/family");
        return;
      }

      const [{ data: loadedCategories, error: categoriesError }, { data: loadedAccounts }, { data: loadedCards }] = await Promise.all([
        supabase.from("categories").select("*").or(`family_id.eq.${familyId},is_default.eq.true`).eq("type", type),
        supabase.from("accounts").select("*").eq("family_id", familyId),
        supabase.from("cards").select("id, name, last_four").eq("family_id", familyId).eq("is_active", true).order("name"),
      ]);

      if (categoriesError) {
        console.error("Erro ao buscar categorias:", categoriesError);
      }

      const nextCategories = loadedCategories || [];
      setCategories(nextCategories);
      if (categoryId && !nextCategories.find((category) => category.id === categoryId)) {
        setCategoryId("");
      }

      setAccounts(loadedAccounts || []);
      setCards(loadedCards || []);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    }
  };

  const processFileLocal = async (file: File, transcript?: string, audioUrl?: string) => {
    if (isViewer) return;
    setIsProcessing(true);
    try {
      const typeStr = file.name.split(".").pop()?.toLowerCase();
      const sourceType = typeStr === "pdf" ? "pdf" : ["jpg", "jpeg", "png"].includes(typeStr || "") ? "image" : "audio";
      setSmartSource(sourceType as any);

      const result = await SmartImportEngine.processFile(file, undefined, transcript, audioUrl);
      if (result.expenses.length > 0) {
        const expense = result.expenses[0];
        if (expense.valor > 0) setAmount(expense.valor.toFixed(2).replace(".", ","));
        if (expense.descricao) setDescription(expense.descricao);
        if (expense.data) setDate(expense.data);
        setLastSmartData(result.expenses);

        if (expense.categoria) {
          const exactCategory = categories.find((category) => category.name.toLowerCase() === expense.categoria.toLowerCase());
          const partialCategory = categories.find(
            (category) =>
              category.name.toLowerCase().includes(expense.categoria.toLowerCase()) ||
              expense.categoria.toLowerCase().includes(category.name.toLowerCase()),
          );
          const bestCategory = exactCategory || partialCategory;
          if (bestCategory) setCategoryId(bestCategory.id);
        }

        toast.info("Dados preenchidos via " + (sourceType === "audio" ? "voz" : "extração local"));
      }
    } catch (err) {
      toast.error("Erro no processamento local");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result && result.file) {
      void processFileLocal(result.file, result.transcript, result.audioUrl);
    }
  };

  const parseAmount = (value: string): number => {
    if (!value || value.trim() === "") return NaN;
    if (value.includes(",")) {
      const normalized = value.replace(/\./g, "").replace(",", ".");
      return parseFloat(normalized);
    }
    return parseFloat(value.replace(/[^0-9.]/g, ""));
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.,]/g, "");
    setAmount(cleaned);
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canCreateTransaction) {
      toast.error("Sem permissão para criar transação.");
      return;
    }

    const parsedAmount = parseAmount(amount);
    const nextErrors: { amount?: string; category?: string; cardId?: string } = {};

    if (isNaN(parsedAmount) || parsedAmount <= 0) nextErrors.amount = "Informe um valor válido";
    if (!categoryId) nextErrors.category = "Selecione uma categoria";
    if (type === "expense" && paymentType === "credit_card" && !cardId) nextErrors.cardId = "Selecione um cartão";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) throw new Error("Família não encontrada");

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            family_id: profile.family_id,
            user_id: user?.id,
            created_by: user?.id,
            amount: parsedAmount,
            type,
            description: description || "",
            category_id: categoryId,
            account_id: accountId || null,
            payment_type: type === "expense" ? paymentType : null,
            card_id: type === "expense" && paymentType === "credit_card" ? cardId : null,
            date,
          } as any,
        ])
        .select();

      if (transactionError) throw transactionError;
      if (!transactionData || transactionData.length === 0) {
        throw new Error("Acesso negado: Você não possui permissão para esta ação.");
      }

      if (smartSource) {
        const { data: historyData, error: historyError } = await supabase
          .from("history_entries")
          .insert({
            user_id: user?.id,
            type: smartSource === "audio" ? "audio" : "documento",
            fileName: smartSource === "audio" ? "Gravação Manual" : "Anexo Manual",
            processedContent: JSON.stringify(lastSmartData || []),
            userMessage: `Nova Transação via ${smartSource}`,
            systemResponse: "Importado diretamente na tela de cadastro.",
          })
          .select();

        if (historyError) throw historyError;
        if (!historyData || historyData.length === 0) {
          throw new Error("Acesso negado: Você não possui permissão para esta ação.");
        }
      }

      toast.success("Transação registrada!");
      navigate("/");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isViewer) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 pb-8 animate-fade-in">
      <div className="flex items-center gap-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-12 w-12 rounded-2xl border border-white/[0.05] bg-white/[0.03] text-white shadow-xl transition-all hover:bg-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lançar</h1>
          <p className="text-sm font-medium text-muted-foreground">Registre sua movimentação hoje</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-10 shadow-2xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-focus-within:bg-primary/10" />
          <div className="relative z-10 space-y-4 text-center">
            <Label
              className={cn(
                "ml-1 text-[10px] font-bold uppercase tracking-[0.3em]",
                type === "income" ? "text-[#22C55E]" : "text-destructive",
              )}
            >
              Valor da {type === "income" ? "Receita" : "Despesa"}
            </Label>
            <div className="relative inline-block w-full">
              <span className="absolute left-[15%] top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                className={cn(
                  "w-full bg-transparent px-10 text-center text-6xl font-bold tracking-tight text-white transition-all placeholder:text-white/5 focus:outline-none",
                  errors.amount && "text-red-400",
                )}
                autoFocus
              />
            </div>
            {errors.amount && <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">{errors.amount}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="grid flex-1 grid-cols-2 gap-2 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-1.5">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "h-14 rounded-[1.5rem] text-sm font-bold transition-all",
                type === "expense" ? "bg-white text-black shadow-xl" : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "h-14 rounded-[1.5rem] text-sm font-bold transition-all",
                type === "income" ? "bg-[#22C55E] text-white shadow-xl shadow-[#22C55E]/20" : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Receita
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(event) => {
                if (event.target.files?.[0]) void processFileLocal(event.target.files[0]);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "h-16 w-16 rounded-[1.5rem] border-white/[0.05] bg-white/[0.02] text-white shadow-xl transition-all",
                isRecording && "border-primary bg-primary/10 text-primary shadow-primary/20",
              )}
              onClick={isRecording ? handleStopRecording : startRecording}
            >
              {isRecording ? <Square className="h-6 w-6 animate-pulse" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-16 w-16 rounded-[1.5rem] border-white/[0.05] bg-white/[0.02] text-white shadow-xl transition-all hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {(isRecording || isProcessing) && (
          <div className="flex items-center justify-between rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {isRecording ? `Gravando Voz... (${duration}s)` : "IA Extraindo Dados..."}
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-8">
          <div className="space-y-4">
            <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Descrição</Label>
            <div className="group relative">
              <Tag className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Ex: Aluguel, Supermercado..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] pl-14 font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Categoria</Label>
              <div className="group relative">
                <LayoutGrid className="absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Select
                  value={categoryId}
                  onValueChange={(value) => {
                    setCategoryId(value);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-16 rounded-2xl bg-white/[0.02] pl-14 font-bold text-white focus-visible:ring-primary/20",
                      errors.category ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]",
                    )}
                  >
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/[0.05] bg-[#0C0C0E] font-bold text-white">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="my-1 rounded-xl transition-colors focus:bg-white/5">
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
                {errors.category && <p className="mt-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-red-400">{errors.category}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Conta de Origem</Label>
              <div className="group relative">
                <Banknote className="absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] pl-14 font-bold text-white focus-visible:ring-primary/20">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/[0.05] bg-[#0C0C0E] font-bold text-white">
                    {accounts.length > 0 ? (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} className="my-1 rounded-xl transition-colors focus:bg-white/5">
                          {account.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Nenhuma conta cadastrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {type === "expense" && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Como foi essa despesa?</Label>
                <Select value={paymentType} onValueChange={(value: "cash" | "credit_card") => setPaymentType(value)}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] font-bold text-white focus-visible:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/[0.05] bg-[#0C0C0E] font-bold text-white">
                    <SelectItem value="cash" className="my-1 rounded-xl transition-colors focus:bg-white/5">
                      Dinheiro
                    </SelectItem>
                    <SelectItem value="credit_card" className="my-1 rounded-xl transition-colors focus:bg-white/5">
                      Cartão de crédito
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentType === "credit_card" && (
                <div className="space-y-4">
                  <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Cartão</Label>
                  <div className="group relative">
                    <CreditCard className="absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Select
                      value={cardId}
                      onValueChange={(value) => {
                        setCardId(value);
                        if (errors.cardId) setErrors((prev) => ({ ...prev, cardId: undefined }));
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-16 rounded-2xl bg-white/[0.02] pl-14 font-bold text-white focus-visible:ring-primary/20",
                          errors.cardId ? "border-red-500/50 bg-red-500/[0.02]" : "border-white/[0.05]",
                        )}
                      >
                        <SelectValue placeholder="Selecione o cartão" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/[0.05] bg-[#0C0C0E] font-bold text-white">
                        {cards.length > 0 ? (
                          cards.map((card) => (
                            <SelectItem key={card.id} value={card.id} className="my-1 rounded-xl transition-colors focus:bg-white/5">
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
                    {errors.cardId && <p className="mt-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-red-400">{errors.cardId}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Data do Lançamento</Label>
            <div className="group relative">
              <CalendarIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-16 appearance-none rounded-2xl border-white/[0.05] bg-white/[0.02] pl-14 font-bold text-white focus-visible:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-18 w-full gap-4 rounded-[1.5rem] bg-white py-8 text-xl font-bold text-black shadow-2xl shadow-white/5 transition-all hover:bg-white/90 active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <><Check className="h-7 w-7" /> Confirmar Lançamento</>}
        </Button>
      </form>
    </div>
  );
};

export default AddTransactionPage;
