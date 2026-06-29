import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const DashboardHeader = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const userInitial = userName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between w-full py-3 px-1 sm:py-5">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-12 w-12 border border-white/10 ring-4 ring-primary/[0.08] shadow-2xl sm:h-14 sm:w-14">
          <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-[#1F2C42] to-[#111827] text-primary font-black text-xs">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.24em]">Bem-vindo(a),</p>
          <h1 className="font-display text-base font-extrabold text-white uppercase tracking-[0.06em] truncate max-w-[210px] sm:max-w-[360px]">
            {userName}
            {!profile?.full_name && !user?.user_metadata?.full_name && "!" ? "" : "!"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          onClick={() => navigate("/add")}
          variant="ghost" size="icon" className="h-12 w-12 min-w-0 rounded-full border border-white/[0.08] bg-[#182233]/80 text-primary shadow-xl shadow-slate-950/20 hover:bg-primary/15 hover:text-white sm:h-14 sm:w-14"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
