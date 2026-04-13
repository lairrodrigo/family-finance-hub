import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Check, 
  Tag, 
  Calendar as CalendarIcon, 
  Loader2, 
  Mic, 
  Paperclip, 
  Square, 
  X,
  ChevronLeft,
  Banknote,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { SmartImportEngine } from "@/services/smartImportEngine";

const AddTransactionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Recorder and Engine
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [smartSource, setSmartSource] = useState<'audio' | 'image' | 'pdf' | null>(null);
  const [lastSmartData, setLastSmartData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      const familyId = profile?.family_id;

      if (!familyId) {
        toast.error("Você precisa estar em uma família para adicionar transações.");
        navigate("/family");
        return;
      }

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .or(`family_id.eq.${familyId},is_default.eq.true`)
        .eq("type", type);
      setCategories(cats || []);

      const { data: accs } = await supabase
        .from("accounts")
        .select("*")
        .eq("family_id", familyId);
      setAccounts(accs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch categories when type changes
  useEffect(() => {
    if (user) fetchData();
  }, [type]);

  const processFileLocal = async (file: File, transcript?: string, audioUrl?: string) => {
    setIsProcessing(true);
    try {
      const typeStr = file.name.split('.').pop()?.toLowerCase();
      const stype = typeStr === 'pdf' ? 'pdf' : (['jpg', 'jpeg', 'png'].includes(typeStr || '') ? 'image' : 'audio');
      setSmartSource(stype as any);

      const result = await SmartImportEngine.processFile(file, undefined, transcript, audioUrl);
      if (result.expenses.length > 0) {
        const exp = result.expenses[0];
        setAmount(exp.valor > 0 ? exp.valor.toString() : amount);
        if (exp.descricao) setDescription(exp.descricao);
        setDate(exp.data);
        setLastSmartData(result.expenses);

        // Auto-select category
        const bestCat = categories.find(c => c.name.toLowerCase().includes(exp.categoria.toLowerCase()));
        if (bestCat) setCategoryId(bestCat.id);
        
        toast.info("Dados preenchidos via " + (stype === 'audio' ? "voz" : "extração local"));
      }
    } catch (err: any) {
      toast.error("Erro no processamento local");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result && result.file) {
      processFileLocal(result.file, result.transcript, result.audioUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      toast.error("Por favor, preencha o valor e a categoria.");
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      
      const { error } = await supabase.from("transactions").insert([{
        family_id: profile?.family_id,
        user_id: user?.id,
        amount: parseFloat(amount.replace(",", ".")),
        type,
        description,
        category_id: categoryId,
        account_id: accountId || null,
        date
      }]);

      if (error) throw error;

      // Persistir no histórico caso tenha vindo de fonte inteligente
      if (smartSource) {
        await supabase.from('history_entries').insert({
          user_id: user?.id,
          type: smartSource === 'audio' ? 'audio' : 'documento',
          fileName: smartSource === 'audio' ? 'Gravação Manual' : 'Anexo Manual',
          processedContent: JSON.stringify(lastSmartData || []),
          userMessage: `Nova Transação via ${smartSource}`,
          systemResponse: `Importado diretamente na tela de cadastro.`
        });
      }

      toast.success("Transação registrada!");
      navigate("/");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (val: string) => {
    // Only allow numbers and one comma/dot
    const cleaned = val.replace(/[^0-9.,]/g, "").replace(",", ".");
    setAmount(cleaned);
  };

  return (
    <div className="flex flex-col gap-10 animate-fade-in max-w-2xl mx-auto pb-32">
      <div className="flex items-center gap-5 px-4 md:px-0 pt-4 md:pt-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)} 
          className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Lançar</h1>
          <p className="text-sm font-medium text-white/20">Registre sua movimentação hoje</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 md:px-0 space-y-10">
        {/* Amount Section */}
        <div className="p-10 bg-[#0C0C0E] border border-white/[0.05] rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/5 rounded-full blur-3xl transition-all group-focus-within:bg-primary/10" />
          <div className="text-center space-y-4 relative z-10">
            <Label className={cn(
              "text-[10px] font-bold uppercase tracking-[0.3em] ml-1",
              type === "income" ? "text-[#22C55E]" : "text-destructive"
            )}>
              Valor da {type === "income" ? "Receita" : "Despesa"}
            </Label>
            <div className="relative inline-block w-full">
              <span className="absolute left-[15%] top-1/2 -translate-y-1/2 text-3xl font-bold text-white/10">R$</span>
              <input 
                type="text" 
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-transparent text-6xl font-bold text-center w-full focus:outline-none placeholder:text-white/5 px-10 transition-all text-white tracking-tight"
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Type Switcher + Smart Actions Row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] flex-1">
            <button 
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "h-14 rounded-[1.5rem] font-bold text-sm transition-all", 
                type === "expense" ? "bg-white text-black shadow-xl" : "text-white/20 hover:text-white/40"
              )}
            >
              Despesa
            </button>
            <button 
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "h-14 rounded-[1.5rem] font-bold text-sm transition-all", 
                type === "income" ? "bg-[#22C55E] text-white shadow-xl shadow-[#22C55E]/20" : "text-white/20 hover:text-white/40"
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
              onChange={(e) => {
                if (e.target.files?.[0]) processFileLocal(e.target.files[0]);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "h-16 w-16 rounded-[1.5rem] bg-white/[0.02] border-white/[0.05] text-white transition-all shadow-xl", 
                isRecording && "border-primary bg-primary/10 text-primary shadow-primary/20"
              )}
              onClick={isRecording ? handleStopRecording : startRecording}
            >
              {isRecording ? <Square className="h-6 w-6 animate-pulse" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-16 w-16 rounded-[1.5rem] bg-white/[0.02] border-white/[0.05] text-white transition-all shadow-xl hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Recording / Processing Status */}
        {(isRecording || isProcessing) && (
          <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-5 flex items-center justify-between animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {isRecording ? `Gravando Voz... (${duration}s)` : "IA Extraindo Dados..."}
              </span>
            </div>
          </div>
        )}

        {/* Main Form Fields */}
        <div className="grid gap-8">
          <div className="space-y-4">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Descrição</Label>
            <div className="relative group">
              <Tag className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Ex: Aluguel, Supermercado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-14 h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold placeholder:text-white/5 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Categoria</Label>
              <div className="relative group">
                <LayoutGrid className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors z-10" />
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="pl-14 h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold focus-visible:ring-primary/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-[#0C0C0E] border-white/[0.05] text-white font-bold">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="rounded-xl my-1 focus:bg-white/5 transition-colors">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Conta de Origem</Label>
              <div className="relative group">
                <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors z-10" />
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="pl-14 h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold focus-visible:ring-primary/20">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-[#0C0C0E] border-white/[0.05] text-white font-bold">
                    {accounts.length > 0 ? (
                      accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl my-1 focus:bg-white/5 transition-colors">
                          {acc.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-[10px] font-bold uppercase text-white/20 tracking-widest text-center py-4">
                        Nenhuma conta cadastrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Data do Lançamento</Label>
            <div className="relative group">
              <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
              <Input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-14 h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold focus-visible:ring-primary/20 appearance-none"
              />
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-18 py-8 rounded-[1.5rem] bg-white text-black text-xl font-bold shadow-2xl shadow-white/5 hover:bg-white/90 active:scale-[0.98] transition-all gap-4"
        >
          {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <><Check className="h-7 w-7" /> Confirmar Lançamento</>}
        </Button>
      </form>
    </div>
  );
};

export default AddTransactionPage;
