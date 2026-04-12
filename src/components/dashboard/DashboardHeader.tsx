import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const DashboardHeader = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || "LAIR";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between w-full px-1 py-2">
      <Avatar className="h-10 w-10 border border-white/5 bg-[#1A1A1A] shrink-0 shadow-xl cursor-pointer">
        <AvatarImage src={user?.user_metadata?.avatar_url} />
        <AvatarFallback className="text-xs font-bold">{userInitial}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center flex-1 text-center px-4">
        <p className="text-[9px] font-black text-[#666666] tracking-[0.2em] uppercase">Bem-vinda de volta,</p>
        <h1 className="text-base font-black tracking-tighter text-white uppercase italic">{userName.split(' ')[0]}!</h1>
      </div>

      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-[#1A1A1A] text-white shrink-0 hover:bg-[#222222] border border-white/5 shadow-xl">
        <Bell className="h-5 w-5" />
      </Button>
    </div>
  );
};
