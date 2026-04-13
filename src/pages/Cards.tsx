import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  Loader2, 
  Save, 
  ChevronLeft, 
  Calendar, 
  DollarSign, 
  Tag, 
  Info,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Cards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "Mastercard",
    last_four: "",
    credit_limit: "",
    due_day: "10",
    closing_day: "3"
  });

  useEffect(() => {
    if (user) fetchCards();
  }, [user]);

  const fetchCards = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) return;

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      toast.error("Erro ao carregar cartões");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!formData.name || !formData.last_four) {
      toast.error("Preencha ao menos o nome e os últimos 4 dígitos");
      return;
    }

    setSaving(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) throw new Error("Família não encontrada");

      const { error } = await supabase.from("cards").insert([{
        user_id: user?.id,
        family_id: profile.family_id,
        name: formData.name,
        brand: formData.brand,
        last_four: formData.last_four,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        due_day: parseInt(formData.due_day),
        closing_day: parseInt(formData.closing_day),
        color: "#1E40AF" // Default blue
      }]);

      if (error) throw error;

      toast.success("Cartão adicionado com sucesso!");
      setIsAdding(false);
      setFormData({ name: "", brand: "Mastercard", last_four: "", credit_limit: "", due_day: "10", closing_day: "3" });
      fetchCards();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar cartão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 px-4 pt-4 pb-32 animate-fade-in md:pt-0 max-w-2xl mx-auto lg:mx-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/more")} 
            className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Cartões</h1>
            <p className="text-sm font-medium text-white/20">Meus cartões e limites</p>
          </div>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-2xl bg-white text-black font-bold hover:bg-white/90 shadow-xl shadow-white/5 gap-2 transition-all active:scale-95">
              <Plus className="h-5 w-5" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 border border-white/[0.05] bg-[#0C0C0E] text-white max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">Novo Cartão</DialogTitle>
            </DialogHeader>

            <div className="space-y-8 mt-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Identificação / Nome</Label>
                <Input 
                  placeholder="Ex: Inter Black, Nubank..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] text-lg font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Bandeira</Label>
                  <Select value={formData.brand} onValueChange={(v) => setFormData({...formData, brand: v})}>
                    <SelectTrigger className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0C0C0E] border-white/[0.05] text-white rounded-2xl font-bold">
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Elo">Elo</SelectItem>
                      <SelectItem value="Amex">Amex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Últimos 4 Dígitos</Label>
                  <Input 
                    placeholder="0000"
                    maxLength={4}
                    value={formData.last_four}
                    onChange={(e) => setFormData({...formData, last_four: e.target.value})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold tracking-[0.4em] text-white placeholder:text-white/5"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Limite de Crédito</Label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold text-white/10 group-focus-within:text-primary transition-colors">R$</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold pl-14 text-white placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Fechamento (Dia)</Label>
                  <Input 
                    type="number"
                    min="1" max="31"
                    value={formData.closing_day}
                    onChange={(e) => setFormData({...formData, closing_day: e.target.value})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Vencimento (Dia)</Label>
                  <Input 
                    type="number"
                    min="1" max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                    className="h-16 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8">
              <Button 
                onClick={handleAddCard} 
                disabled={saving}
                className="w-full h-16 rounded-[1.5rem] bg-white text-black font-bold text-lg gap-2 shadow-2xl shadow-white/5 hover:bg-white/90 transition-all active:scale-[0.98]"
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                Concluir Cadastro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-white/10" />
        </div>
      ) : cards.length > 0 ? (
        <div className="grid gap-6">
          {cards.map((card) => (
             <Card key={card.id} className="p-10 bg-[#0C0C0E] border border-white/[0.05] rounded-[2.5rem] flex flex-col gap-12 relative overflow-hidden group shadow-2xl transition-all hover:translate-y-[-4px] hover:bg-[#121214]">
                <div className="flex justify-between items-start z-10 relative">
                   <div className="h-14 w-14 rounded-2xl bg-white/[0.03] flex items-center justify-center text-primary border border-white/[0.05] shadow-xl group-hover:scale-110 transition-transform">
                      <CreditCard className="h-7 w-7" />
                   </div>
                   <div className="text-right space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/10 tracking-[0.2em]">{card.brand || "Credit Card"}</p>
                      <p className="font-bold text-2xl text-white tracking-tight">{card.name}</p>
                   </div>
                </div>

                <div className="flex justify-between items-end z-10 relative">
                   <div>
                      <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em] mb-3">Family Account Member</p>
                      <p className="text-3xl font-bold tracking-[0.3em] text-white/80"><span className="text-white/20 tracking-normal mr-2">••••</span> {card.last_four}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em] mb-2">Limite disponível</p>
                      <p className="text-3xl font-bold text-white tracking-tighter">R$ {card.credit_limit?.toLocaleString('pt-BR') || "0"}</p>
                   </div>
                </div>

                {/* Info Bar */}
                <div className="flex gap-6 pt-8 border-t border-white/[0.05] z-10 relative">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-white/20" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Fecha dia {card.closing_day}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-primary/40" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Protegido</span>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -right-40 -bottom-40 w-80 h-80 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-all duration-700" />
                <div className="absolute -left-40 -top-40 w-80 h-80 bg-white/5 blur-[100px] rounded-full group-hover:bg-white/10 transition-all duration-700" />
             </Card>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center space-y-8 border-2 border-dashed rounded-[3.5rem] border-white/5 bg-white/[0.01]">
          <div className="h-24 w-24 bg-[#0C0C0E] rounded-[2rem] flex items-center justify-center mx-auto border border-white/5 shadow-2xl transition-transform hover:rotate-12">
            <CreditCard className="h-12 w-12 text-white/10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl tracking-tight">Nenhum cartão</h2>
            <p className="text-white/20 font-medium text-sm">Adicione seu primeiro cartão para começar.</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="h-14 px-10 rounded-[1.5rem] bg-white text-black font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/5 active:scale-95">
             Começar agora
          </Button>
        </div>
      )}
    </div>
  );
};

export default Cards;

