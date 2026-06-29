import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
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
    <Card
      className={cn(
        "premium-panel-hover relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-[1.5rem] p-5 shadow-2xl sm:min-h-[178px] sm:p-6",
        type === "income"
          ? "border-emerald-400/20 bg-gradient-to-br from-[#0D5C4B] via-[#125143] to-[#182233]"
          : "border-blue-400/20 bg-gradient-to-br from-[#203A74] via-[#1B2D55] to-[#182233]",
      )}
    >
      <Icon className="absolute right-5 top-5 h-16 w-16 text-white/[0.06] sm:h-20 sm:w-20" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.08] shadow-lg sm:h-12 sm:w-12",
            type === "income" ? "text-emerald-300" : "text-[#F87171]",
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75 sm:text-[11px]">
          {label}
        </span>
      </div>

      <div className="relative space-y-1">
        <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/45">Este mês</p>
        <p
          className={cn(
            "font-display break-all text-2xl font-extrabold tracking-tight sm:text-3xl",
            type === "income" ? "text-white" : "text-[#FF8D8D]",
          )}
        >
          {showValues ? value : "R$ ••••"}
        </p>
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[2px] opacity-50",
          type === "income" ? "bg-emerald-300" : "bg-[#F87171]",
        )}
      />
    </Card>
  );
};
