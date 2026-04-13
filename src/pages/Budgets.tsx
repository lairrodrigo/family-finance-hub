import { useNavigate } from "react-router-dom";
import { ChevronLeft, Target, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const BudgetsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-10 animate-fade-in max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-5">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)} 
          className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Orçamentos</h1>
          <p className="text-sm font-medium text-white/20">Limite seus gastos por categoria</p>
        </div>
      </div>

      <div>
        <div className="py-32 text-center space-y-8 border-2 border-dashed rounded-[3rem] border-white/5 bg-white/[0.01] relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 h-40 w-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
          
          <div className="relative z-10 space-y-8">
            <div className="h-24 w-24 bg-[#0C0C0E] rounded-[2rem] flex items-center justify-center mx-auto border border-white/5 shadow-2xl transition-transform group-hover:rotate-12 group-hover:scale-110 duration-500">
              <Target className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <h2 className="text-2xl font-bold text-white tracking-tight">Em Breve</h2>
              </div>
              <p className="text-sm font-medium text-white/20 max-w-xs mx-auto leading-relaxed">
                Estamos preparando uma ferramenta completa para você planejar cada centavo do seu mês.
              </p>
            </div>

            <Button 
              onClick={() => navigate("/")} 
              className="h-14 px-10 rounded-[1.5rem] bg-white text-black font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/5 active:scale-95"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetsPage;
