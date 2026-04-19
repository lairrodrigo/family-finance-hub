import { useAuth } from "@/contexts/AuthContext";
import { Bell, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const DashboardHeader = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const userInitial = userName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between w-full py-4 px-1">
      <div className="flex items-center gap-4">
        <Avatar className="h-11 w-11 border border-white/5 ring-4 ring-white/[0.02] shadow-2xl">
          <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-[#111111] to-[#050505] text-muted-foreground font-black text-xs">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Bem-vindo(a),</p>
          <h1 className="text-sm font-black text-white uppercase tracking-wider truncate max-w-[180px]">
            {userName}
            {!profile?.full_name && !user?.user_metadata?.full_name && "!" ? "" : "!"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          onClick={() => navigate("/add")}
          variant="ghost" size="icon" className="h-10 w-10 min-w-0 rounded-full bg-white/[0.03] text-muted-foreground hover:text-white hover:bg-white/10 border border-white/[0.05]"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 min-w-0 rounded-full bg-white/[0.03] text-muted-foreground hover:text-white hover:bg-white/10 border border-white/[0.05]">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
