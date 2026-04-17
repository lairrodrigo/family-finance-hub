import { useState } from "react";
import { Plus, Loader2, Save, DollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddCardDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddCardDialog = ({ onSuccess, trigger, open, onOpenChange }: AddCardDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "Mastercard",
    last_four: "",
    credit_limit: "",
    due_day: "10",
    closing_day: "3"
  });

  const handleAddCard = async () => {
    if (!formData.name || !formData.last_four) {
      toast.error("Preencha ao menos o nome e os últimos 4 dígitos");
      return;
    }

    setSaving(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (!profile?.family_id) throw new Error("Família não encontrada");

      const { data, error } = await supabase.from("cards").insert([{
        user_id: user?.id,
        family_id: profile.family_id,
        name: formData.name,
        brand: formData.brand,
        last_four: formData.last_four,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        due_day: parseInt(formData.due_day),
        closing_day: parseInt(formData.closing_day),
        color: "#1E40AF"
      }]).select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");

      toast.success("Cartão adicionado!");
      setFormData({ name: "", brand: "Mastercard", last_four: "", credit_limit: "", due_day: "10", closing_day: "3" });
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar cartão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none bg-[#0A0A0A] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic uppercase italic">Novo Cartão</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Identificação / Nome</Label>
            <Input 
              placeholder="Ex: Inter Black, Nubank..."
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="h-14 rounded-2xl bg-[#111111] border-white/5 text-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Bandeira</Label>
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
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Últimos 4 Dígitos</Label>
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
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Limite de Crédito</Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Fechamento (Dia)</Label>
              <Input 
                type="number"
                min="1" max="31"
                value={formData.closing_day}
                onChange={(e) => setFormData({...formData, closing_day: e.target.value})}
                className="h-14 rounded-2xl bg-[#111111] border-white/5 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Vencimento (Dia)</Label>
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

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-4 mt-8 pt-6 pb-2 border-t border-white/5">
          <Button 
            variant="ghost"
            onClick={() => onOpenChange?.(false)}
            className="w-full h-16 rounded-[1.5rem] text-muted-foreground font-bold text-lg hover:bg-white/5 hover:text-white transition-all order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAddCard} 
            disabled={saving}
            className="w-full h-16 rounded-[1.5rem] bg-white text-black font-black text-lg gap-2 shadow-2xl shadow-white/10 hover:bg-white/90 transition-all active:scale-[0.98] order-1 sm:order-2"
          >
            {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
            Salvar Cartão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

