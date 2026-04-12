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
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <div className="flex flex-col gap-1 px-4 md:px-0 pt-4 md:pt-0">
        <h1 className="font-display text-3xl font-black tracking-tight">Compras</h1>
        <p className="text-sm text-muted-foreground font-medium">Economize e controle sua dispensa</p>
      </div>

      <div className="flex items-center gap-3 px-4 md:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar listas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-card border-none shadow-sm"
          />
        </div>
        <Button onClick={() => setIsNewListOpen(true)} className="h-12 rounded-2xl gap-2 font-bold px-5 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
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
              className="group p-6 rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all cursor-pointer bg-card hover:translate-y-[-6px] relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -right-4 -top-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl transition-all group-hover:bg-primary/10" />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex flex-col gap-1">
                  <Badge variant={list.status === 'concluida' ? 'success' : 'secondary'} className="rounded-full w-fit px-3 font-bold text-[10px] uppercase tracking-wider">
                    {list.status === 'concluida' ? 'Concluída' : 'Em Andamento'}
                  </Badge>
                  <h3 className="text-xl font-black mt-2 leading-none truncate max-w-[180px]">{list.name}</h3>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-muted">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl p-2 border-none shadow-2xl">
                    <DropdownMenuItem onClick={(e) => handleDuplicate(e, list.id)} className="rounded-xl gap-2 font-bold focus:bg-primary focus:text-primary-foreground py-2.5">
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDelete(e, list.id)} className="rounded-xl gap-2 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive py-2.5">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 mb-6 relative z-10">
                <div className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-tight">
                  <div className="p-1.5 bg-muted rounded-lg"><Calendar className="h-3.5 w-3.5" /></div>
                  {format(new Date(list.date), "dd 'de' MMMM", { locale: ptBR })}
                </div>
                {list.store && (
                  <div className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-tight">
                    <div className="p-1.5 bg-muted rounded-lg"><Store className="h-3.5 w-3.5" /></div>
                    {list.store}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border/40 flex justify-between items-end relative z-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Estimado</p>
                  <div className="flex items-baseline gap-1">
                     <span className="text-sm font-bold opacity-40">R$</span>
                     <p className="text-2xl font-black">{list.total_estimated?.toFixed(2)}</p>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New List Dialog */}
      <Dialog open={isNewListOpen} onOpenChange={setIsNewListOpen}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Organizar Compra</DialogTitle>
            <DialogDescription className="font-medium">Defina um nome para sua nova jornada de economia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome da Lista</Label>
              <Input 
                placeholder="Ex: Compra Mensal, Churrasco..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none text-lg font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Loja / Supermercado (Opcional)</Label>
              <Input 
                placeholder="Ex: Carrefour, Atacadão..."
                value={newListStore}
                onChange={(e) => setNewListStore(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateNew} className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20">
              Começar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shopping;
