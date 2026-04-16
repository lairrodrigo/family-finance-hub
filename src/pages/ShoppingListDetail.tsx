import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Camera,
  CheckCircle,
  Package,
  Tag,
  Calculator,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShoppingListRecord {
  id: string;
  name: string;
  status: string;
}

interface ShoppingListItemRecord {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit_price_retail: number;
  unit_price_wholesale: number;
  min_qty_wholesale: number;
  is_collected: boolean;
}

interface ShoppingScannerResponse {
  shoppingItems?: Array<{
    name?: string;
    price?: number;
    wholesalePrice?: number;
    wholesaleMinQty?: number;
  }>;
  name?: string;
  price?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
}

const ShoppingListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [list, setList] = useState<ShoppingListRecord | null>(null);
  const [items, setItems] = useState<ShoppingListItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit_price_retail: 0,
    unit_price_wholesale: 0,
    min_qty_wholesale: 0,
  });
  const [finishData, setFinishData] = useState({
    total_paid: 0,
    payment_method: "cartao",
    category_id: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      void fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    try {
      const { data: listData, error: listError } = await supabase.from("shopping_lists").select("*").eq("id", id).single();
      if (listError) throw listError;
      setList(listData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("list_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch {
      toast.error("Erro ao carregar detalhes");
    } finally {
      setLoading(false);
    }
  };

  const syncListTotal = async (currentItems: ShoppingListItemRecord[]) => {
    const estimated = currentItems.reduce((accumulator, item) => {
      const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
      const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
      return accumulator + (price * item.quantity);
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
      const pendingItem: ShoppingListItemRecord = {
        id: crypto.randomUUID(),
        list_id: id || "",
        name: newItem.name,
        quantity: newItem.quantity,
        unit_price_retail: newItem.unit_price_retail,
        unit_price_wholesale: newItem.unit_price_wholesale,
        min_qty_wholesale: newItem.min_qty_wholesale,
        is_collected: false,
      };
      setNewItem({ name: "", quantity: 1, unit_price_retail: 0, unit_price_wholesale: 0, min_qty_wholesale: 0 });
      void fetchDetail();
      void syncListTotal([...items, pendingItem]);
    } catch {
      toast.error("Erro ao adicionar");
    }
  };

  const handleScanner = async (file: File) => {
    setIsProcessing(true);
    toast.info("A IA visual está analisando a foto...");

    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke<ShoppingScannerResponse>("process-financial-document", {
        body: {
          contextType: "shopping",
          fileBase64,
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
        },
      });

      if (error) throw error;

      const parsedItem = Array.isArray(data?.shoppingItems) ? data.shoppingItems[0] : data;
      if (!parsedItem) {
        throw new Error("A IA respondeu, mas não encontrou o produto na imagem.");
      }

      setNewItem({
        name: parsedItem.name || "Produto Escaneado",
        quantity: 1,
        unit_price_retail: parsedItem.price || 0,
        unit_price_wholesale: parsedItem.wholesalePrice || 0,
        min_qty_wholesale: parsedItem.wholesaleMinQty || 0,
      });
      setIsAddItemOpen(true);

      if (parsedItem.price && parsedItem.name) {
        toast.success(`Capturado: ${parsedItem.name} — R$ ${parsedItem.price.toFixed(2)}`);
      } else {
        toast.info("Confira e ajuste se a IA teve dúvida.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro de servidor ao processar a foto";
      console.error(err);
      toast.error(message);
      setNewItem({ name: "Produto Escaneado", quantity: 1, unit_price_retail: 0, unit_price_wholesale: 0, min_qty_wholesale: 0 });
      setIsAddItemOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCollected = async (itemId: string, currentStatus: boolean) => {
    try {
      await supabase.from("shopping_list_items").update({ is_collected: !currentStatus }).eq("id", itemId);
      setItems(items.map((item) => item.id === itemId ? { ...item, is_collected: !currentStatus } : item));
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await supabase.from("shopping_list_items").delete().eq("id", itemId);
      const nextItems = items.filter((item) => item.id !== itemId);
      setItems(nextItems);
      void syncListTotal(nextItems);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 0.1) return;

    try {
      await supabase.from("shopping_list_items").update({ quantity: newQty }).eq("id", itemId);
      const nextItems = items.map((item) => item.id === itemId ? { ...item, quantity: newQty } : item);
      setItems(nextItems);
      void syncListTotal(nextItems);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    try {
      await supabase.from("shopping_lists").update({
        status: "concluida",
        total_paid: finishData.total_paid,
      }).eq("id", id);

      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user.id).single();

      await supabase.from("transactions").insert([{
        user_id: user.id,
        family_id: profile?.family_id,
        amount: finishData.total_paid,
        type: "expense",
        description: `Compras: ${list?.name}`,
        date: new Date().toISOString(),
        category_id: finishData.category_id || null,
      }]);

      toast.success("Compra finalizada e registrada no financeiro!");
      navigate("/shopping");
    } catch {
      toast.error("Erro ao finalizar");
    }
  };

  const calculateTotals = () => {
    const estimated = items.reduce((accumulator, item) => {
      const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
      const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;
      return accumulator + (price * item.quantity);
    }, 0);

    return { estimated };
  };

  const { estimated } = calculateTotals();

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 animate-fade-in pb-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/shopping")}
            className="h-12 w-12 rounded-2xl border border-white/[0.05] bg-white/[0.03] text-white shadow-xl transition-all hover:bg-white/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">{list?.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {list?.status === "concluida" ? "Compra Finalizada" : "Em Aberto"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditOpen(true)}
            className="h-10 gap-2 rounded-xl border-white/[0.05] bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-white/5 active:scale-95"
          >
            <Calculator className="h-4 w-4" /> Conferir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="group relative overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-8 shadow-2xl">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
          <p className="relative z-10 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Previsto</p>
          <p className="relative z-10 text-3xl font-bold tracking-tight text-white">R$ {estimated.toFixed(2)}</p>
        </Card>
        <Card className="group relative overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-8 shadow-2xl">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl transition-all group-hover:bg-white/10" />
          <p className="relative z-10 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Coletados</p>
          <div className="relative z-10 flex items-baseline gap-1">
            <p className="text-3xl font-bold tracking-tight text-white">{items.filter((item) => item.is_collected).length}</p>
            <span className="text-xl font-bold text-muted-foreground">/</span>
            <p className="text-xl font-bold tracking-tight text-muted-foreground">{items.length}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="space-y-6 rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.01] py-24 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lista Vazia</p>
              <p className="text-sm font-medium text-muted-foreground">O que vamos comprar hoje?</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const useWholesale = item.min_qty_wholesale > 0 && item.quantity >= item.min_qty_wholesale;
            const price = useWholesale ? item.unit_price_wholesale : item.unit_price_retail;

            return (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center justify-between rounded-[2.5rem] border bg-[#0C0C0E] p-5 shadow-2xl transition-all",
                  item.is_collected ? "border-primary/20 bg-[#0C0C0E]/60 shadow-none" : "border-white/[0.05]"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-5">
                  <button
                    onClick={() => void toggleCollected(item.id, item.is_collected)}
                    className={cn(
                      "h-14 w-14 shrink-0 rounded-2xl border border-white/[0.03] shadow-xl transition-all active:scale-95",
                      item.is_collected ? "border-primary bg-primary text-white shadow-primary/20" : "bg-white/[0.03] text-muted-foreground"
                    )}
                  >
                    {item.is_collected ? <CheckCircle className="mx-auto h-7 w-7" /> : <Package className="mx-auto h-7 w-7" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <p className={cn("truncate text-base font-bold text-white", item.is_collected && "opacity-30")}>{item.name}</p>
                      {useWholesale && <Badge className="h-5 border-none bg-primary/10 px-2 text-[9px] font-bold uppercase tracking-widest text-primary">ATACADO</Badge>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-2.5 py-1">
                        <button onClick={() => void updateQuantity(item.id, item.quantity - 1)} className="p-1 text-muted-foreground transition-colors hover:text-white">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button onClick={() => void updateQuantity(item.id, item.quantity + 1)} className="p-1 text-muted-foreground transition-colors hover:text-white">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        R$ {price.toFixed(2)} {useWholesale ? "/at" : "/un"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 flex-col items-end gap-2 text-right">
                  <p className={cn("text-xl font-bold tracking-tight text-white", item.is_collected && "opacity-30")}>R$ {(price * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => void deleteItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/5 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-10 text-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold tracking-tight">Conferência</DialogTitle></DialogHeader>
          <div className="custom-scrollbar max-h-[50vh] space-y-4 overflow-y-auto py-4 pr-2">
            {items.map((item) => {
              const expected = (item.quantity >= item.min_qty_wholesale && item.min_qty_wholesale > 0 ? item.unit_price_wholesale : item.unit_price_retail) * item.quantity;
              return (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Planejado: R$ {expected.toFixed(2)}</p>
                  </div>
                  <div className="h-2 w-10 rounded-full bg-primary/20" />
                </div>
              );
            })}
          </div>
          <Button onClick={() => { setIsAuditOpen(false); setIsFinishOpen(true); }} className="mt-4 h-16 rounded-[1.5rem] bg-white text-lg font-bold text-black shadow-xl transition-all hover:bg-white/90">
            Ir para o Caixa
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-10 text-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold tracking-tight">Finalizar Compra</DialogTitle></DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Confirmado no Caixa</Label>
              <div className="group relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">R$</span>
                <Input type="number" value={finishData.total_paid} onChange={(e) => setFinishData({ ...finishData, total_paid: parseFloat(e.target.value) })} className="h-24 rounded-[1.5rem] border-white/[0.05] bg-white/[0.02] pl-16 text-4xl font-bold text-white transition-all focus-visible:ring-primary/20" />
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estimado: R$ {estimated.toFixed(2)}</span>
                <Badge variant={finishData.total_paid > estimated ? "destructive" : "default"} className="border-none px-3 py-1 text-[10px] font-bold uppercase shadow-xl">
                  {(finishData.total_paid - estimated) > 0 ? `+ R$ ${(finishData.total_paid - estimated).toFixed(2)}` : `- R$ ${Math.abs(finishData.total_paid - estimated).toFixed(2)}`}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFinishData({ ...finishData, payment_method: "cartao" })}
                className={cn(
                  "flex h-16 items-center justify-center gap-3 rounded-2xl border font-bold transition-all",
                  finishData.payment_method === "cartao" ? "border-white bg-white text-black shadow-xl" : "border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <CreditCard className="h-5 w-5" /> Cartão
              </button>
              <button
                onClick={() => setFinishData({ ...finishData, payment_method: "dinheiro" })}
                className={cn(
                  "flex h-16 items-center justify-center gap-3 rounded-2xl border font-bold transition-all",
                  finishData.payment_method === "dinheiro" ? "border-white bg-white text-black shadow-xl" : "border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Banknote className="h-5 w-5" /> Dinheiro
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void handleFinish()} className="h-16 w-full rounded-[1.5rem] bg-[#22C55E] text-lg font-bold text-white shadow-2xl shadow-[#22C55E]/20 transition-all hover:bg-[#1EBC58] hover:scale-[1.01] active:scale-[0.98]">
              Registrar no Financeiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-10 left-1/2 z-40 flex w-full max-w-lg -translate-x-1/2 gap-4 px-6">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleScanner(e.target.files[0])} />

        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button className="group flex-1 gap-3 overflow-hidden rounded-[1.5rem] bg-white text-lg font-bold text-black shadow-2xl transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-[0.98]">
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
              {isProcessing ? "IA Lendo Etiqueta..." : "Adicionar Item"}
            </Button>
          </DialogTrigger>
          <DialogContent className="custom-scrollbar max-h-[90vh] max-w-lg overflow-y-auto rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">O que levar?</DialogTitle>
            </DialogHeader>

            <div className="mt-6 space-y-8">
              <div className="space-y-3">
                <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Nome do Produto</Label>
                <Input
                  placeholder="Ex: Arroz, Leite, Pão..."
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] text-lg font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Quantidade</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                    className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] font-bold text-white"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">R$ Varejo (Un)</Label>
                  <Input
                    type="number"
                    value={newItem.unit_price_retail}
                    onChange={(e) => setNewItem({ ...newItem, unit_price_retail: parseFloat(e.target.value) })}
                    className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] font-bold text-[#22C55E]"
                  />
                </div>
              </div>

              <div className="space-y-6 rounded-[2.5rem] border border-white/[0.05] bg-white/[0.01] p-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><Tag className="h-4 w-4 text-primary" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Preço de Atacado</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qtd Mínima</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 3"
                      value={newItem.min_qty_wholesale}
                      onChange={(e) => setNewItem({ ...newItem, min_qty_wholesale: parseFloat(e.target.value) })}
                      className="h-14 rounded-2xl border-white/[0.05] bg-white/[0.02] font-bold text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">R$ Atacado</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2.50"
                      value={newItem.unit_price_wholesale}
                      onChange={(e) => setNewItem({ ...newItem, unit_price_wholesale: parseFloat(e.target.value) })}
                      className="h-14 rounded-2xl border-white/[0.05] bg-white/[0.02] font-bold text-primary"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={addItem} className="h-16 w-full gap-3 rounded-[1.5rem] bg-white text-lg font-bold text-black shadow-2xl shadow-white/5 transition-all hover:bg-white/90 active:scale-[0.98]">
                <Save className="h-6 w-6" />
                Salvar Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="h-16 w-16 flex-shrink-0 rounded-[1.5rem] border border-white/[0.05] bg-[#0C0C0E] text-muted-foreground shadow-2xl transition-all hover:scale-105 hover:text-primary">
          <Camera className={cn("h-8 w-8", isProcessing && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListDetail;
