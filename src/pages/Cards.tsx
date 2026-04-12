import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CreditCard, Loader2, Save, X, Calendar, DollarSign, Tag, Info } from "lucide-react";
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
    <div className="flex flex-col gap-8 px-4 pt-4 pb-32 animate-fade-in md:pt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-black text-white px-1">Meus Cartões</h1>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-white text-black font-black hover:bg-white/90 shadow-xl shadow-white/10 gap-2">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none bg-[#0A0A0A] text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black italic uppercase">Novo Cartão</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Identificação / Nome</Label>
                <Input 
                  placeholder="Ex: Inter Black, Nubank..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-14 rounded-2xl bg-[#111111] border-white/5 text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Bandeira</Label>
                  <Select value={formData.brand} onValueChange={(v) => setFormData({...formData, brand: v})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-[#111111] border-white/5 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-white/5 text-white">
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Elo">Elo</SelectItem>
                      <SelectItem value="Amex">Amex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Últimos 4 Dígitos</Label>
                  <Input 
                    placeholder="0000"
                    maxLength={4}
                    value={formData.last_four}
                    onChange={(e) => setFormData({...formData, last_four: e.target.value})}
                    className="h-14 rounded-2xl bg-[#111111] border-white/5 font-bold tracking-[0.5em]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Limite de Crédito</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#444444]" />
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                    className="h-14 rounded-2xl bg-[#111111] border-white/5 font-black pl-12 text-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Fechamento (Dia)</Label>
                  <Input 
                    type="number"
                    min="1" max="31"
                    value={formData.closing_day}
                    onChange={(e) => setFormData({...formData, closing_day: e.target.value})}
                    className="h-14 rounded-2xl bg-[#111111] border-white/5 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666] ml-1">Vencimento (Dia)</Label>
                  <Input 
                    type="number"
                    min="1" max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                    className="h-14 rounded-2xl bg-[#111111] border-white/5 font-bold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={handleAddCard} 
                disabled={saving}
                className="w-full h-16 rounded-[1.5rem] bg-white text-black font-black text-lg gap-2 shadow-xl shadow-white/5 hover:bg-white/90"
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                Salvar Cartão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-white/20" />
        </div>
      ) : cards.length > 0 ? (
        <div className="grid gap-4">
          {cards.map((card) => (
             <Card key={card.id} className="p-7 bg-[#111111] border-none rounded-[2.5rem] flex flex-col gap-8 relative overflow-hidden group shadow-2xl">
                <div className="flex justify-between items-start z-10">
                   <div className="h-12 w-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-white/40 border border-white/5">
                      <CreditCard className="h-6 w-6" />
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-[#444444] tracking-[0.2em] mb-1">{card.brand || "Credit Card"}</p>
                      <p className="font-black text-xl text-white italic tracking-tight">{card.name}</p>
                   </div>
                </div>

                <div className="flex justify-between items-end z-10 mt-2">
                   <div>
                      <p className="text-[10px] font-black text-[#444444] uppercase tracking-widest mb-1 opacity-60 italic">Holder family account</p>
                      <p className="text-2xl font-black tracking-[0.25em] text-white">• • • • {card.last_four}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-[#444444] uppercase tracking-widest mb-1 italic">Limit</p>
                      <p className="text-2xl font-black text-blue-400 tracking-tighter">R$ {card.credit_limit?.toLocaleString('pt-BR') || "0"}</p>
                   </div>
                </div>

                {/* Info Bar */}
                <div className="flex gap-4 pt-4 border-t border-white/[0.03] z-10">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-[#444444]" />
                    <span className="text-[9px] font-black text-[#666666] uppercase tracking-widest">Fecha dia {card.closing_day}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-[#444444]" />
                    <span className="text-[9px] font-black text-[#666666] uppercase tracking-widest">Ativo</span>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -right-32 -bottom-32 w-64 h-64 bg-primary/5 blur-[120px] rounded-full group-hover:bg-primary/10 transition-colors" />
                <div className="absolute -left-32 -top-32 w-64 h-64 bg-white/5 blur-[120px] rounded-full group-hover:bg-white/10 transition-colors" />
             </Card>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-6 border-2 border-dashed rounded-[3.5rem] border-white/5 bg-white/[0.01]">
          <div className="h-20 w-20 bg-[#111111] rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-2xl">
            <CreditCard className="h-10 w-10 text-[#444444]" />
          </div>
          <div className="space-y-1">
            <p className="text-white font-black text-lg uppercase italic tracking-tighter">Nenhum cartão</p>
            <p className="text-[#444444] font-bold text-xs tracking-tight">Adicione seu primeiro cartão para começar.</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="h-12 px-8 rounded-2xl bg-[#1A1A1A] text-white border border-white/5 font-black hover:bg-white/5 transition-all">
             Começar agora
          </Button>
        </div>
      )}
    </div>
  );
};

export default Cards;

