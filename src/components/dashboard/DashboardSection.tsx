import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export const DashboardSection = ({
  title,
  icon: Icon,
  actionLabel,
  onAction,
  children,
}: DashboardSectionProps) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-white shrink-0 hover:opacity-70 transition-opacity"
          >
            <Icon className="h-5 w-5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

export const DashedAddCard = ({ label, onClick }: { label: string; onClick?: () => void }) => {
  return (
    <button 
      onClick={onClick}
      className="flex w-full flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-[#222222] py-10 transition-all hover:bg-[#111111] group active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A] group-hover:bg-[#222222] transition-colors">
        <span className="text-2xl font-light text-[#7B7B7B]">+</span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7B7B7B]">{label}</span>
    </button>
  );
};
