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
      className="premium-panel-hover flex w-full flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-white/[0.12] bg-white/[0.03] py-10 transition-all group active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
        <span className="text-2xl font-light text-primary">+</span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </button>
  );
};
