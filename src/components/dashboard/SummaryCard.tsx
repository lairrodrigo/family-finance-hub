import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface SummaryCardProps {
  label: string;
  value: string;
  type: "income" | "expense";
}

export const SummaryCard = ({ label, value, type }: SummaryCardProps) => {
  const { showValues } = useSettings();
  const Icon = type === "income" ? ArrowUp : ArrowDown;
  const colorClass = type === "income" ? "text-[#7B7B7B]" : "text-[#7B7B7B]"; // Labels are gray in original
  const bgIconClass = type === "income" ? "bg-[#222222]" : "bg-[#222222]";

  return (
    <Card className="flex flex-col gap-3 p-5 border border-white/5 bg-[#111111] rounded-[2rem] shadow-xl">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgIconClass} ${type === 'income' ? 'text-primary' : 'text-destructive'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-[#7B7B7B] uppercase tracking-wider">Este mês</p>
        <p className="text-xl font-black text-white">
          {showValues ? value : "R$ ••••"}
        </p>
      </div>
    </Card>
  );
};
