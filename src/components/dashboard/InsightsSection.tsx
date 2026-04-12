import { Card } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const InsightsSection = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 px-1">
        <h2 className="text-lg font-black text-white tracking-tight">Insights IA</h2>
        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-1.5 rounded-sm uppercase tracking-widest">Beta</Badge>
      </div>

      <Card className="relative p-6 border-none bg-[#111111] rounded-[2rem] overflow-hidden group">
        {/* Glowing Orange Border Effect */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent opacity-60" />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-[#FF8C00] to-transparent opacity-60" />
        
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center shrink-0 border border-white/5">
            <Brain className="h-6 w-6 text-[#7B7B7B]" />
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-black text-[#FF8C00] uppercase tracking-widest">Saldo do mês: R$-5188.</p>
            <p className="text-sm text-[#7B7B7B] leading-snug font-medium">
              Atenção: gastos acima da receita. Recomendamos revisar suas despesas fixas para o próximo ciclo.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
