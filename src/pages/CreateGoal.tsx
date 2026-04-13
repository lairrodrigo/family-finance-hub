import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Target, 
  DollarSign, 
  Calendar, 
  Info,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CreateGoal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createGoal, isCreating } = useGoals();
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    deadline: "",
    category: "Economias",
  });
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFamily = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("user_id", user.id)
        .single();
      setHasFamily(!!profile?.family_id);
    };
    checkFamily();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasFamily) {
      toast.error("Você precisa criar uma família primeiro!");
      navigate("/family");
      return;
    }
    
    try {
      const amount = parseFloat(formData.targetAmount.replace(",", "."));
      if (isNaN(amount)) {
        toast.error("Por favor, insira um valor válido.");
        return;
      }

      await createGoal({
        name: formData.name,
        target_amount: amount,
        deadline: formData.deadline || null,
        category: formData.category,
      });

      toast.success("Meta criada com sucesso!");
      navigate("/metas");
    } catch (err: any) {
      toast.error("Erro ao criar meta: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-fade-in max-w-2xl mx-auto pb-32">
      {/* Header with Back Button */}
      <div className="flex items-center gap-5 px-4 md:px-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nova Meta</h1>
          <p className="text-sm font-medium text-white/20">Defina seu próximo objetivo financeiro.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 md:px-0">
        <Card className="p-8 md:p-10 space-y-10 border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] shadow-2xl">
          {/* Goal Name */}
          <div className="space-y-4">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">
              O que você quer conquistar?
            </Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-primary transition-colors">
                <Target className="h-5 w-5" />
              </div>
              <Input
                id="name"
                placeholder="Ex: Viagem para o Japão"
                className="pl-12 h-16 bg-white/[0.02] border-white/[0.05] focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-bold rounded-2xl text-white placeholder:text-white/5 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isCreating}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Target Amount */}
            <div className="space-y-4">
              <Label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">
                Quanto você precisa?
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-primary transition-colors">
                  <DollarSign className="h-5 w-5" />
                </div>
                <Input
                  id="amount"
                  placeholder="0,00"
                  type="text"
                  className="pl-12 h-16 bg-white/[0.02] border-white/[0.05] focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-bold rounded-2xl text-white placeholder:text-white/5 transition-all"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-4">
              <Label htmlFor="deadline" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">
                Até quando?
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-primary transition-colors">
                  <Calendar className="h-5 w-5" />
                </div>
                <Input
                  id="deadline"
                  type="date"
                  className="pl-12 h-16 bg-white/[0.02] border-white/[0.05] focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-bold rounded-2xl text-white transition-all [color-scheme:dark]"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-4">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">
              Categoria do objetivo
            </Label>
            <div className="flex flex-wrap gap-2.5">
              {['Viagem', 'Casa', 'Veículo', 'Reserva', 'Educação', 'Outros'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={isCreating}
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    formData.category === cat 
                      ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" 
                      : "bg-white/5 text-white/40 border-transparent hover:border-white/10 hover:text-white/60"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform hover:scale-110">
            <Info className="h-5 w-5" />
          </div>
          <p className="text-xs text-white/30 font-medium leading-relaxed">
            Dica: Metas com datas definidas têm <span className="text-primary font-bold">70% mais chances</span> de serem concluídas com sucesso.
          </p>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={isCreating}
          className="h-16 rounded-[1.5rem] bg-white text-black text-lg font-bold shadow-2xl shadow-white/5 hover:bg-white/90 hover:scale-[1.01] active:scale-[0.98] transition-all mt-4"
        >
          {isCreating ? "Criando objetivo..." : "Concluir e Salvar"}
        </Button>
      </form>
    </div>
  );
};

export default CreateGoal;
