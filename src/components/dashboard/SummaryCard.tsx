import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  value: string;
  type: "income" | "expense";
}

export const SummaryCard = ({ label, value, type }: SummaryCardProps) => {
  const { showValues } = useSettings();
  const Icon = type === "income" ? ArrowUp : ArrowDown;
  
  return (
    <Card className="flex flex-col gap-4 sm:gap-5 p-5 sm:p-6 border border-white/[0.05] bg-[#0C0C0E] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:bg-[#111114] transition-all duration-500">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn(
          "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/[0.03] shrink-0",
          type === 'income' ? 'bg-[#121212] text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-[#121212] text-[#f87171] shadow-[0_0_20px_rgba(248,113,113,0.1)]'
        )}>
          <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</span>
      </div>
      
      <div className="space-y-0.5 sm:space-y-1">
        <p className="text-[7px] sm:text-[8px] font-bold text-muted-foreground uppercase tracking-[0.25em]">Este mês</p>
        <p className="text-lg sm:text-xl font-black text-white tracking-widest break-all">
          {showValues ? value : "R$ ••••"}
        </p>
      </div>
      
      {/* Subtle bottom accent */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[1.5px] opacity-20",
        type === 'income' ? 'bg-primary' : 'bg-red-500'
      )} />
    </Card>
  );
};

