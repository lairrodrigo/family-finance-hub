import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera, MoreVertical, CheckCircle, Package, Tag, Calculator, Save, Trash2, X, ChevronDown, ChevronUp, AlertCircle, ShoppingCart, Loader2, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ShoppingListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [list, setList] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);

  // Form states
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit_price_retail: 0,
    unit_price_wholesale: 0,
    min_qty_wholesale: 0,
  });

  const [finishData, setFinishData] = useState({
    total_paid: 0,
    payment_method: 'cartao', // cartao or dinheiro
    category_id: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const { data: listData, error: listError } = await supabase.from("shopping_lists").select("*").eq("id", id).single();
      if (listError) throw listError;
      setList(listData);

      const { data: itemsData, error: itemsError } = await supabase.from("shopping_list_items").select("*").eq("list_id", id).order("created_at", { ascending: true });
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (err: any) {
      toast.error("Erro ao carregar detalhes");
    } finally {
      setLoading(false);
    }
  };

  const syncListTotal = async (currentItems: any[]) => {
    const estimated = currentItems.reduce((acc, item) => {
      const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
      const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
      return acc + (price * item.quantity);
    }, 0);
    
    await supabase.from("shopping_lists").update({ total_estimated: estimated }).eq("id", id);
  };

  const addItem = async () => {
    if (!newItem.name) return;
    try {
      const { error } = await supabase.from("shopping_list_items").insert([{
        list_id: id,
        name: newItem.name,
        quantity: newItem.quantity,
        unit_price_retail: newItem.unit_price_retail,
        unit_price_wholesale: newItem.unit_price_wholesale,
        min_qty_wholesale: newItem.min_qty_wholesale,
      }]);
      if (error) throw error;
      toast.success("Item adicionado");
      setIsAddItemOpen(false);
      setNewItem({ name: "", quantity: 1, unit_price_retail: 0, unit_price_wholesale: 0, min_qty_wholesale: 0 });
      fetchDetail();
      syncListTotal([...items, newItem]);
    } catch (err: any) {
      toast.error("Erro ao adicionar");
    }
  };

  const handleScanner = async (file: File) => {
    setIsProcessing(true);
    toast.info("A IA visual está analisando a foto...");

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      toast.error("Chave da API Gemini (VITE_GEMINI_API_KEY) não encontrada no .env");
      setIsProcessing(false);
      return;
    }

    try {
      // Converte imagem para Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const prompt = `Você é um robô leitor de Inteligência Artificial para um sistema de supermercado. O usuário tirou uma foto de uma etiqueta de prateleira ou rótulo.
      Seu objetivo é extrair precisamente o NOME do produto, o PREÇO Varejo unitário, e, caso a etiqueta informe preços de atacado ("a partir de X unidades: preço Y"), extrair a quantidade mínima e o preço de atacado.
      Descarte o código de barras e mensagens promocionais puras. Foque só na marca/tipo e peso (ex: "Sopa Knorr 73g Letrinhas").
      Retorne ESTRITAMENTE e EXCLUSIVAMENTE um objeto JSON no formato abaixo, sem markdown:
      {"name": "nome limpo do produto", "price": 0.00, "wholesalePrice": 0.00, "wholesaleMinQty": 0}
      Se não houver preço de atacado, retorne 0 nos campos wholesale.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: file.type || 'image/jpeg',
                  data: fileBase64
                }
              }
            ]
          }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1
          }
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(`API: ${result.error.message}`);
      }

      if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Resultado Gemini:", JSON.stringify(result));
        throw new Error("A IA respondeu, mas não encontrou o produto na imagem.");
      }

      let textResponse = result.candidates[0].content.parts[0].text;
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(textResponse);

      setNewItem({
        name: parsedData.name || "Produto Escaneado",
        quantity: 1,
        unit_price_retail: parsedData.price || 0,
        unit_price_wholesale: parsedData.wholesalePrice || 0,
        min_qty_wholesale: parsedData.wholesaleMinQty || 0
      });
      setIsAddItemOpen(true);

      if (parsedData.price > 0 && parsedData.name) {
        toast.success(`Capturado: ${parsedData.name} — R$ ${parsedData.price.toFixed(2)}`);
      } else {
        toast.info("Confira e ajuste se a IA teve dúvida.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro de servidor ao processar a foto");
      setNewItem({ name: 'Produto Escaneado', quantity: 1, unit_price_retail: 0, unit_price_wholesale: 0, min_qty_wholesale: 0 });
      setIsAddItemOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCollected = async (itemId: string, currentStatus: boolean) => {
    try {
      await supabase.from("shopping_list_items").update({ is_collected: !currentStatus }).eq("id", itemId);
      setItems(items.map(it => it.id === itemId ? { ...it, is_collected: !currentStatus } : it));
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await supabase.from("shopping_list_items").delete().eq("id", itemId);
      const newItems = items.filter(it => it.id !== itemId);
      setItems(newItems);
      syncListTotal(newItems);
    } catch (err) {
      toast.error("Erro ao remover");
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 0.1) return;
    try {
      await supabase.from("shopping_list_items").update({ quantity: newQty }).eq("id", itemId);
      const newItems = items.map(it => it.id === itemId ? { ...it, quantity: newQty } : it);
      setItems(newItems);
      syncListTotal(newItems);
    } catch (err) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    try {
      const { estimated } = calculateTotals();
      
      // 1. Atualizar lista
      await supabase.from("shopping_lists").update({ 
        status: 'concluida', 
        total_paid: finishData.total_paid 
      }).eq("id", id);

      // 2. Criar transação (Simplificado p/ MVP)
      const { data: profile } = await supabase.from('profiles').select('family_id').eq('user_id', user.id).single();
      
      await supabase.from('transactions').insert([{
        user_id: user.id,
        family_id: profile?.family_id,
        amount: finishData.total_paid,
        type: 'expense',
        description: `Compras: ${list.name}`,
        date: new Date().toISOString(),
        category_id: finishData.category_id || null
      }]);

      toast.success("Compra finalizada e registrada no financeiro!");
      navigate("/shopping");
    } catch (err) {
      toast.error("Erro ao finalizar");
    }
  };

  const calculateTotals = () => {
    const estimated = items.reduce((acc, item) => {
      const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
      const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
      return acc + (price * item.quantity);
    }, 0);
    return { estimated };
  };

  const { estimated } = calculateTotals();

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-40 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/shopping")} 
            className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{list?.name}</h1>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">{list?.status === 'concluida' ? 'Compra Finalizada' : 'Em Aberto'}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => setIsAuditOpen(true)} 
             className="h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-wider bg-white/[0.03] text-white/60 border-white/[0.05] hover:bg-white/5 active:scale-95 transition-all"
           >
              <Calculator className="h-4 w-4" /> Conferir
           </Button>
        </div>
      </div>

      {/* Totals Banner */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-8 rounded-[2.5rem] bg-[#0C0C0E] border border-white/[0.05] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl transition-all group-hover:bg-primary/10" />
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20 mb-2 relative z-10">Total Previsto</p>
          <p className="text-3xl font-bold text-white tracking-tight relative z-10">R$ {estimated.toFixed(2)}</p>
        </Card>
        <Card className="p-8 rounded-[2.5rem] bg-[#0C0C0E] border border-white/[0.05] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/5 rounded-full blur-2xl transition-all group-hover:bg-white/10" />
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20 mb-2 relative z-10">Coletados</p>
          <div className="flex items-baseline gap-1 relative z-10">
            <p className="text-3xl font-bold text-white tracking-tight">{items.filter(i => i.is_collected).length}</p>
            <span className="text-xl font-bold text-white/10">/</span>
            <p className="text-xl font-bold text-white/20 tracking-tight">{items.length}</p>
          </div>
        </Card>
      </div>

      {/* List Content */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="py-24 text-center space-y-6 border-2 border-dashed rounded-[3rem] border-white/5 bg-white/[0.01]">
            <Package className="h-12 w-12 mx-auto text-white/10" />
            <div className="space-y-1">
              <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Lista Vazia</p>
              <p className="text-sm font-medium text-white/20">O que vamos comprar hoje?</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
            const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
            return (
              <div key={item.id} className={cn(
                "p-5 bg-[#0C0C0E] rounded-[2.5rem] flex items-center justify-between shadow-2xl transition-all border group", 
                item.is_collected ? "border-primary/20 bg-[#0C0C0E]/60 shadow-none" : "border-white/[0.05]"
              )}>
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <button 
                    onClick={() => toggleCollected(item.id, item.is_collected)} 
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-xl border border-white/[0.03]", 
                      item.is_collected ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white/[0.03] text-white/20"
                    )}
                  >
                    {item.is_collected ? <CheckCircle className="h-7 w-7" /> : <Package className="h-7 w-7" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className={cn("font-bold text-base text-white truncate", item.is_collected && "opacity-30")}>{item.name}</p>
                      {useWholesale && <Badge className="h-5 text-[9px] font-bold px-2 uppercase tracking-widest bg-primary/10 text-primary border-none">ATACADO</Badge>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-xl px-2.5 py-1 shrink-0">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-white/20 hover:text-white transition-colors p-1"><ChevronDown className="h-4 w-4" /></button>
                        <span className="text-xs font-bold w-7 text-center text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-white/20 hover:text-white transition-colors p-1"><ChevronUp className="h-4 w-4" /></button>
                      </div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] truncate">
                        R$ {price.toFixed(2)} {useWholesale ? '/at' : '/un'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4 flex flex-col items-end gap-2 shrink-0">
                  <p className={cn("font-bold text-xl text-white tracking-tight", item.is_collected && "opacity-30")}>R$ {(price * item.quantity).toFixed(2)}</p>
                  <button 
                    onClick={() => deleteItem(item.id)} 
                    className="h-8 w-8 rounded-lg text-white/10 hover:text-destructive hover:bg-destructive/5 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Audit Modal */}
      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="rounded-[2.5rem] p-10 border border-white/[0.05] bg-[#0C0C0E] text-white max-w-lg shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold tracking-tight">Conferência</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar py-4">
             {items.map(item => {
               const expected = (item.quantity >= item.min_qty_wholesale && item.min_qty_wholesale > 0 ? item.unit_price_wholesale : item.unit_price_retail) * item.quantity;
               return (
                 <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                   <div className="space-y-1">
                     <p className="text-sm font-bold text-white">{item.name}</p>
                     <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">Planejado: R$ {expected.toFixed(2)}</p>
                   </div>
                   <div className="h-2 w-10 rounded-full bg-primary/20" />
                 </div>
               );
             })}
          </div>
          <Button onClick={() => { setIsAuditOpen(false); setIsFinishOpen(true); }} className="h-16 rounded-[1.5rem] bg-white text-black font-bold text-lg hover:bg-white/90 shadow-xl transition-all mt-4">
            Ir para o Caixa
          </Button>
        </DialogContent>
      </Dialog>

      {/* Finish Modal */}
      <Dialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
        <DialogContent className="rounded-[2.5rem] p-10 border border-white/[0.05] bg-[#0C0C0E] text-white max-w-lg shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold tracking-tight">Finalizar Compra</DialogTitle></DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Total Confirmado no Caixa</Label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/20">R$</span>
                <Input type="number" value={finishData.total_paid} onChange={(e) => setFinishData({...finishData, total_paid: parseFloat(e.target.value)})} className="h-24 pl-16 rounded-[1.5rem] bg-white/[0.02] border-white/[0.05] text-4xl font-bold text-white focus-visible:ring-primary/20 transition-all" />
              </div>
              <div className="flex justify-between items-center px-2">
                 <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Estimado: R$ {estimated.toFixed(2)}</span>
                 <Badge variant={(finishData.total_paid > estimated) ? 'destructive' : 'default'} className="font-bold rounded-lg px-3 py-1 text-[10px] uppercase border-none shadow-xl">
                    {(finishData.total_paid - estimated) > 0 ? `+ R$ ${(finishData.total_paid - estimated).toFixed(2)}` : `- R$ ${Math.abs(finishData.total_paid - estimated).toFixed(2)}`}
                 </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setFinishData({...finishData, payment_method: 'cartao'})} className={cn(
                 "h-16 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border",
                 finishData.payment_method === 'cartao' ? "bg-white text-black border-white shadow-xl" : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white hover:bg-white/5"
               )}>
                 <CreditCard className="h-5 w-5" /> Cartão
               </button>
               <button onClick={() => setFinishData({...finishData, payment_method: 'dinheiro'})} className={cn(
                 "h-16 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border",
                 finishData.payment_method === 'dinheiro' ? "bg-white text-black border-white shadow-xl" : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white hover:bg-white/5"
               )}>
                 <Banknote className="h-5 w-5" /> Dinheiro
               </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFinish} className="w-full h-16 rounded-[1.5rem] bg-[#22C55E] text-white text-lg font-bold shadow-2xl shadow-[#22C55E]/20 hover:bg-[#1EBC58] transition-all hover:scale-[1.01] active:scale-[0.98]">
              Registrar no Financeiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Actions */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 flex gap-4 z-40">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleScanner(e.target.files[0])} />
        
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 h-16 rounded-[1.5rem] shadow-2xl bg-white text-black hover:bg-white/90 gap-3 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden">
               {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
               {isProcessing ? "IA Lendo Etiqueta..." : "Adicionar Item"}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 border border-white/[0.05] bg-[#0C0C0E] text-white max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">O que levar?</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-8 mt-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Nome do Produto</Label>
                <Input 
                  placeholder="Ex: Arroz, Leite, Pão..."
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-lg font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Quantidade</Label>
                  <Input 
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">R$ Varejo (Un)</Label>
                  <Input 
                    type="number"
                    value={newItem.unit_price_retail}
                    onChange={(e) => setNewItem({...newItem, unit_price_retail: parseFloat(e.target.value)})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-[#22C55E]"
                  />
                </div>
              </div>

              <div className="p-8 bg-white/[0.01] border border-white/[0.05] rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-xl"><Tag className="h-4 w-4 text-primary" /></div>
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Preço de Atacado</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Qtd Mínima</Label>
                    <Input 
                      type="number"
                      placeholder="Ex: 3"
                      value={newItem.min_qty_wholesale}
                      onChange={(e) => setNewItem({...newItem, min_qty_wholesale: parseFloat(e.target.value)})}
                      className="h-14 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">R$ Atacado</Label>
                    <Input 
                      type="number"
                      placeholder="Ex: 2.50"
                      value={newItem.unit_price_wholesale}
                      onChange={(e) => setNewItem({...newItem, unit_price_wholesale: parseFloat(e.target.value)})}
                      className="h-14 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-primary"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={addItem} className="w-full h-16 rounded-[1.5rem] bg-white text-black text-lg font-bold shadow-2xl shadow-white/5 hover:bg-white/90 gap-3 transition-all active:scale-[0.98]">
                <Save className="h-6 w-6" />
                Salvar Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="h-16 w-16 rounded-[1.5rem] shadow-2xl bg-[#0C0C0E] border border-white/[0.05] flex-shrink-0 group hover:scale-105 transition-all text-white/40 hover:text-primary">
          <Camera className={cn("h-8 w-8", isProcessing && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListDetail;
