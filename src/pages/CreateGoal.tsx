import { useEffect } from "react";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    <div className="flex flex-col gap-8 animate-fade-in max-w-2xl mx-auto md:pt-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Nova Meta</h1>
          <p className="text-sm text-muted-foreground">Defina seu próximo objetivo financeiro.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="p-6 md:p-8 space-y-8 border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm">
          {/* Goal Name */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              O que você quer conquistar?
            </Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Target className="h-5 w-5" />
              </div>
              <Input
                id="name"
                placeholder="Ex: Viagem para o Japão"
                className="pl-12 h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium rounded-2xl"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isCreating}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Amount */}
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Quanto você precisa?
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <DollarSign className="h-5 w-5" />
                </div>
                <Input
                  id="amount"
                  placeholder="0,00"
                  type="text"
                  className="pl-12 h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium rounded-2xl"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-3">
              <Label htmlFor="deadline" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Até quando?
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Calendar className="h-5 w-5" />
                </div>
                <Input
                  id="deadline"
                  type="date"
                  className="pl-12 h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-medium rounded-2xl"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Categoria
            </Label>
            <div className="flex flex-wrap gap-2">
              {['Viagem', 'Casa', 'Veículo', 'Reserva', 'Educação', 'Outros'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={isCreating}
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                    formData.category === cat 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                      : "bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Tip Box omitted for brevity or kept if short */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Metas realistas e com prazos definidos têm 70% mais chances de serem concluídas. 
          </p>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={isCreating}
          className="h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all mt-4"
        >
          {isCreating ? "Criando..." : "Criar Meta"}
        </Button>
      </form>
    </div>
  );
};

// Simple CN utility just in case
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default CreateGoal;
