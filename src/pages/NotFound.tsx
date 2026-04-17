import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Ghost, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6">
      <div className="max-w-md w-full p-12 bg-[#0C0C0E] border border-white/[0.05] rounded-[3rem] shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-24 w-24 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] flex items-center justify-center mx-auto text-primary shadow-xl">
          <Ghost className="h-12 w-12" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-black text-white tracking-tighter">404</h1>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Perdido no Espaço?</h2>
            <p className="text-sm font-medium text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
              Essa página não faz parte do seu ecossistema financeiro.
            </p>
          </div>
        </div>

        <Button 
          onClick={() => navigate("/")}
          className="w-full h-16 rounded-[1.5rem] bg-white text-black font-bold text-lg hover:bg-white/90 shadow-2xl shadow-white/5 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Home className="h-6 w-6" />
          Voltar para Início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

