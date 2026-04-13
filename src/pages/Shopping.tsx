import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Calendar, Store, ChevronRight, MoreVertical, Copy, Trash2, CheckCircle2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useShopping } from "@/hooks/useShopping";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Shopping = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getShoppingLists, createShoppingList, deleteShoppingList, duplicateShoppingList } = useShopping();
  
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // New Modal States
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListStore, setNewListStore] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getShoppingLists();
      setLists(data || []);
    } catch (err) {
      toast.error("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user.id).single();
      const listName = newListName || `Compra ${format(new Date(), "dd/MM")}`;
      
      const data = await createShoppingList(listName, newListStore, profile?.family_id, user.id);
      setIsNewListOpen(false);
      setNewListName("");
      setNewListStore("");
      navigate(`/shopping/${data.id}`);
    } catch (err: any) {
      toast.error("Erro ao criar lista");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteShoppingList(id);
      setLists(lists.filter(l => l.id !== id));
      toast.success("Lista removida");
    } catch (err) {
      toast.error("Erro ao remover");
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      const newList = await duplicateShoppingList(id, user!.id, profile?.family_id);
      setLists([newList, ...lists]);
      toast.success("Lista duplicada!");
    } catch (err) {
      toast.error("Erro ao duplicar");
    }
  };

  const filteredLists = lists.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.store && l.store.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-32">
      <div className="flex flex-col gap-1 px-4 md:px-0 pt-4 md:pt-0">
        <h1 className="text-3xl font-bold tracking-tight text-white">Compras</h1>
        <p className="text-sm font-medium text-white/20">Economize e controle sua dispensa</p>
      </div>

      <div className="flex items-center gap-4 px-4 md:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10" />
          <Input 
            placeholder="Buscar listas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-none text-sm font-bold placeholder:text-white/5 transition-all"
          />
        </div>
        <Button onClick={() => setIsNewListOpen(true)} className="h-14 rounded-2xl gap-2 font-bold px-6 bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5 transition-all active:scale-95">
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Criar Lista</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-4 md:px-0">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-muted animate-pulse" />
          ))
        ) : filteredLists.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-6">
             <div className="h-24 w-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border-4 border-white shadow-xl">
               <ShoppingCart className="h-12 w-12 text-primary/40" />
             </div>
             <div>
               <p className="font-black text-xl">Sua despensa te espera!</p>
               <p className="text-sm text-muted-foreground">Que tal começar uma lista para o final de semana?</p>
             </div>
             <Button variant="outline" onClick={() => setIsNewListOpen(true)} className="rounded-2xl h-12 font-bold">Criar minha primeira lista</Button>
          </div>
        ) : (
          filteredLists.map((list) => (
            <Card 
              key={list.id}
              onClick={() => navigate(`/shopping/${list.id}`)}
              className="group p-7 rounded-[2.5rem] border border-white/[0.05] shadow-2xl transition-all cursor-pointer bg-[#0C0C0E] hover:translate-y-[-6px] relative overflow-hidden active:scale-[0.98]"
            >
              {/* Background Glow */}
              <div className="absolute -right-8 -top-8 h-32 w-32 bg-primary/5 rounded-full blur-3xl transition-all group-hover:bg-primary/10" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex flex-col gap-2">
                  <Badge className="rounded-xl w-fit px-3 py-1 font-bold text-[9px] uppercase tracking-widest bg-white/5 text-white/40 border-none">
                    {list.status === 'concluida' ? 'Concluída' : 'Em Andamento'}
                  </Badge>
                  <h3 className="text-xl font-bold text-white tracking-tight mt-1 truncate max-w-[180px]">{list.name}</h3>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/5 text-white/20">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl p-2 border border-white/[0.05] bg-[#0C0C0E] shadow-2xl text-white">
                    <DropdownMenuItem onClick={(e) => handleDuplicate(e, list.id)} className="rounded-xl gap-2 font-bold focus:bg-white/5 py-2.5">
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDelete(e, list.id)} className="rounded-xl gap-2 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive py-2.5">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.05]"><Calendar className="h-3.5 w-3.5" /></div>
                  {format(new Date(list.date), "dd 'de' MMMM", { locale: ptBR })}
                </div>
                {list.store && (
                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.05]"><Store className="h-3.5 w-3.5" /></div>
                    {list.store}
                  </div>
                )}
              </div>

              <div className="pt-7 border-t border-white/5 flex justify-between items-end relative z-10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-1.5">Total Estimado</p>
                  <div className="flex items-baseline gap-1">
                     <span className="text-sm font-bold text-white/20 tracking-tighter">R$</span>
                     <p className="text-2xl font-bold text-white tracking-tight">{list.total_estimated?.toFixed(2)}</p>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New List Dialog */}
      <Dialog open={isNewListOpen} onOpenChange={setIsNewListOpen}>
        <DialogContent className="rounded-[2.5rem] p-10 border border-white/[0.05] bg-[#0C0C0E] text-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Organizar Compra</DialogTitle>
            <DialogDescription className="font-medium text-white/20">Defina um nome para sua nova jornada de economia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Nome da Lista</Label>
              <Input 
                placeholder="Ex: Compra Mensal, Churrasco..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-lg font-bold placeholder:text-white/5 transition-all text-white focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Loja / Supermercado (Opcional)</Label>
              <Input 
                placeholder="Ex: Carrefour, Atacadão..."
                value={newListStore}
                onChange={(e) => setNewListStore(e.target.value)}
                className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold placeholder:text-white/5 transition-all text-white focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateNew} className="w-full h-16 rounded-[1.5rem] bg-white text-black text-lg font-bold shadow-2xl shadow-white/5 hover:bg-white/90 transition-all hover:scale-[1.01] active:scale-[0.98]">
              Começar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shopping;
