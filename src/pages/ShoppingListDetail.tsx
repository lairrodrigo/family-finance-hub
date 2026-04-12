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
    <div className="flex flex-col gap-6 animate-fade-in pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-0 pt-4 md:pt-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/shopping")} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <div className="space-y-0.5">
            <h1 className="font-display text-xl font-bold">{list?.name}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{list?.status === 'concluida' ? 'Compra Finalizada' : 'Em Aberto'}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => setIsAuditOpen(true)} className="rounded-3xl gap-2 font-black text-[10px] uppercase bg-success/10 text-success border-success/20">
              <Calculator className="h-3 w-3" /> Conferir
           </Button>
        </div>
      </div>

      {/* Totals Banner */}
      <div className="grid grid-cols-2 gap-4 px-4 md:px-0">
        <Card className="p-6 rounded-[2.5rem] bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] text-white border border-white/[0.03] shadow-2xl">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#666666] mb-1">Total Previsto</p>
          <p className="text-3xl font-black">R$ {estimated.toFixed(2)}</p>
        </Card>
        <Card className="p-6 rounded-[2.5rem] bg-[#111111] border border-white/[0.03] text-white">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#666666] mb-1">Itens Coletados</p>
          <p className="text-3xl font-black">{items.filter(i => i.is_collected).length}<span className="text-[#333333]">/</span>{items.length}</p>
        </Card>
      </div>

      {/* List Content */}
      <div className="px-4 md:px-0 space-y-3">
        {items.length === 0 ? (
          <div className="py-20 text-center space-y-4 border-2 border-dashed rounded-[2rem] border-muted-foreground/20">
            <Package className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm font-medium text-muted-foreground">O que vamos comprar hoje?</p>
          </div>
        ) : (
          items.map((item) => {
            const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
            const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
            return (
              <div key={item.id} className={cn("p-4 bg-card rounded-3xl flex items-center justify-between shadow-sm border transition-all", item.is_collected ? "border-success/30 bg-success/5" : "border-border/50")}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button 
                    onClick={() => toggleCollected(item.id, item.is_collected)} 
                    className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0", item.is_collected ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}
                  >
                    {item.is_collected ? <CheckCircle className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-bold text-base truncate", item.is_collected && "line-through opacity-70")}>{item.name}</p>
                      {useWholesale && <Badge variant="success" className="h-5 text-[9px] font-black px-1.5 uppercase">ATACADO</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-0.5 shrink-0">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="hover:text-primary transition-colors"><ChevronDown className="h-4 w-4" /></button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="hover:text-primary transition-colors"><ChevronUp className="h-4 w-4" /></button>
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                        R$ {price.toFixed(2)} {useWholesale ? '/at' : '/un'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4 flex flex-col items-end gap-1 shrink-0">
                  <p className="font-black text-lg leading-none">R$ {(price * item.quantity).toFixed(2)}</p>
                  <button 
                    onClick={() => deleteItem(item.id)} 
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
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
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg">
          <DialogHeader><DialogTitle className="text-2xl font-black">Conferência de Preços</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
             {items.map(item => {
               const expected = (item.quantity >= item.min_qty_wholesale && item.min_qty_wholesale > 0 ? item.unit_price_wholesale : item.unit_price_retail) * item.quantity;
               return (
                 <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/50">
                   <div className="text-sm font-bold">{item.name} <span className="text-muted-foreground block text-[10px] uppercase">Planejado: R$ {expected.toFixed(2)}</span></div>
                   <div className="h-3 w-12 rounded-full bg-success/20" /> {/* Atualmente apenas visual p/ MVP */}
                 </div>
               );
             })}
          </div>
          <Button onClick={() => { setIsAuditOpen(false); setIsFinishOpen(true); }} className="h-14 rounded-2xl font-bold bg-success text-success-foreground hover:bg-success/90">Ir para o Caixa</Button>
        </DialogContent>
      </Dialog>

      {/* Finish Modal */}
      <Dialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader><DialogTitle className="text-2xl font-black">Finalizar Compra</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Quanto deu no caixa?</Label>
              <Input type="number" value={finishData.total_paid} onChange={(e) => setFinishData({...finishData, total_paid: parseFloat(e.target.value)})} className="h-16 rounded-2xl bg-muted/50 border-none text-2xl font-black" />
              <div className="flex justify-between items-center px-1">
                 <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Estimado: R$ {estimated.toFixed(2)}</span>
                 <Badge variant={(finishData.total_paid > estimated) ? 'destructive' : 'success'} className="font-bold">
                    {(finishData.total_paid - estimated) > 0 ? `+ R$ ${(finishData.total_paid - estimated).toFixed(2)}` : `- R$ ${Math.abs(finishData.total_paid - estimated).toFixed(2)}`}
                 </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <Button variant={finishData.payment_method === 'cartao' ? 'default' : 'outline'} onClick={() => setFinishData({...finishData, payment_method: 'cartao'})} className="h-14 rounded-2xl gap-2 font-bold"><CreditCard className="h-5 w-5" /> Cartão</Button>
               <Button variant={finishData.payment_method === 'dinheiro' ? 'default' : 'outline'} onClick={() => setFinishData({...finishData, payment_method: 'dinheiro'})} className="h-14 rounded-2xl gap-2 font-bold"><Banknote className="h-5 w-5" /> Dinheiro</Button>
            </div>
          </div>
          <DialogFooter><Button onClick={handleFinish} className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-success/20 bg-success text-success-foreground hover:bg-success/90">Lançar no Financeiro</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Actions */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 flex gap-3 z-40">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleScanner(e.target.files[0])} />
        
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 h-16 rounded-2xl shadow-2xl shadow-primary/40 gap-3 text-lg font-black group overflow-hidden">
               {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
               {isProcessing ? "Lendo..." : "Adicionar Item"}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="h-6 w-6" />
                </div>
                O que levar?
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Nome do Produto</Label>
                <Input 
                  placeholder="Ex: Arroz, Leite, Pão..."
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Quantidade</Label>
                  <Input 
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">R$ Varejo (Un)</Label>
                  <Input 
                    type="number"
                    value={newItem.unit_price_retail}
                    onChange={(e) => setNewItem({...newItem, unit_price_retail: parseFloat(e.target.value)})}
                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-success"
                  />
                </div>
              </div>

              <div className="p-5 bg-muted/20 rounded-3xl space-y-4 border border-border/50">
                 <div className="flex items-center gap-2 mb-1">
                   <AlertCircle className="h-4 w-4 text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary">Preço de Atacado</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground">Qtd Mínima</Label>
                    <Input 
                      type="number"
                      placeholder="Ex: 3"
                      value={newItem.min_qty_wholesale}
                      onChange={(e) => setNewItem({...newItem, min_qty_wholesale: parseFloat(e.target.value)})}
                      className="h-12 rounded-xl bg-background border-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground">R$ Atacado</Label>
                    <Input 
                      type="number"
                      placeholder="Ex: 2.50"
                      value={newItem.unit_price_wholesale}
                      onChange={(e) => setNewItem({...newItem, unit_price_wholesale: parseFloat(e.target.value)})}
                      className="h-12 rounded-xl bg-background border-none font-bold text-primary"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={addItem} className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-xl shadow-primary/20 gap-3">
                <Save className="h-6 w-6" />
                Adicionar à Lista
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="h-16 w-16 rounded-2xl shadow-xl bg-card border-none flex-shrink-0 group hover:scale-105 transition-all">
          <Camera className={cn("h-8 w-8 text-primary", isProcessing && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListDetail;
