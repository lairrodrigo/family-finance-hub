import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Tag, Calendar as CalendarIcon, Loader2, Mic, Paperclip, Square, X } from "lucide-react";
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
    <div className="flex flex-col gap-6 animate-fade-in max-w-xl mx-auto pb-20">
      <div className="flex items-center gap-4 px-4 pt-4 md:pt-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-xl font-bold">Nova Transação</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-6">
        {/* Amount Section */}
        <div className="text-center space-y-2 py-4">
          <Label className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            type === "income" ? "text-success" : "text-destructive"
          )}>
            Valor da {type === "income" ? "Receita" : "Despesa"}
          </Label>
          <div className="relative inline-block w-full">
            <span className="absolute left-[20%] top-1/2 -translate-y-1/2 text-2xl font-bold opacity-50">R$</span>
            <input 
              type="text" 
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="bg-transparent text-5xl font-bold text-center w-full focus:outline-none placeholder:opacity-20 px-10 transition-all border-b-2 border-transparent focus:border-primary/20"
              autoFocus
            />
          </div>
        </div>

        {/* Type Switcher + Smart Actions Row */}
        <div className="flex gap-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl flex-1">
            <Button 
              type="button"
              variant={type === "expense" ? "default" : "ghost"}
              onClick={() => setType("expense")}
              className={cn("rounded-xl h-11", type === "expense" && "shadow-inner bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              Despesa
            </Button>
            <Button 
              type="button"
              variant={type === "income" ? "default" : "ghost"}
              onClick={() => setType("income")}
              className={cn("rounded-xl h-11", type === "income" && "shadow-inner bg-success text-success-foreground hover:bg-success/90")}
            >
              Receita
            </Button>
          </div>

          <div className="flex gap-2">
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
              className={cn("h-11 w-11 rounded-xl shrink-0 transition-all", isRecording && "border-primary bg-primary/10 text-primary")}
              onClick={isRecording ? handleStopRecording : startRecording}
            >
              {isRecording ? <Square className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Info de Gravação / Processamento */}
        {(isRecording || isProcessing) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-medium text-primary">
                {isRecording ? `Ouvindo... (${duration}s)` : "Processando extração local..."}
              </span>
            </div>
            {isRecording && (
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleStopRecording()}>
                PARAR
              </Button>
            )}
          </div>
        )}

        {/* Main Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">Descrição</Label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Ex: Aluguel, Supermercado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-card border-none shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-14 rounded-2xl bg-card border-none shadow-sm pl-4">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-xl my-1">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "expense" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-bold text-muted-foreground ml-1">Conta (Opcional)</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-14 rounded-2xl bg-card border-none shadow-sm pl-4">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {accounts.length > 0 ? (
                      accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl my-1">
                          {acc.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nenhuma conta<br/>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground ml-1">Data</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-card border-none shadow-sm"
              />
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Check className="mr-2 h-6 w-6" /> Confirmar</>}
        </Button>
      </form>
    </div>
  );
};

export default AddTransactionPage;
