import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { Mail, Lock, User, Sparkles, Loader2 } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { cn } from "@/lib/utils";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px]" />

      <div className="w-full max-w-md z-10 space-y-12">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <AppLogo size={80} className="hover:scale-110 transition-transform duration-500" />
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">Divvy Money</h1>
            <p className="text-sm font-medium text-white/20 uppercase tracking-[0.2em]">
              {isLogin ? "Sua Vida Financeira Unificada" : "Comece sua Jornada"}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="p-10 bg-[#0C0C0E] border border-white/[0.05] rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">{isLogin ? "Bem-vindo de volta" : "Criar nova conta"}</h2>
            <p className="text-sm text-white/20 font-medium">Preencha seus dados para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Nome Completo</Label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-16 pl-14 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Endereço de E-mail</Label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 pl-14 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Senha Segura</Label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-16 pl-14 rounded-2xl bg-white/[0.02] border-white/[0.05] text-white font-bold placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-18 py-8 rounded-[1.5rem] bg-white text-black text-xl font-bold shadow-2xl shadow-white/5 hover:bg-white/90 active:scale-[0.98] transition-all gap-4 mt-4" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : isLogin ? "Entrar agora" : "Cadastrar conta"}
            </Button>
          </form>

          {/* Toggle Button */}
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-white/20 hover:text-white transition-all tracking-tight"
            >
              {isLogin ? "Não tem uma conta? " : "Já possui cadastro? "}
              <span className="text-primary hover:underline">{isLogin ? "Cadastre-se grátis" : "Fazer Login"}</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/10">
          <Sparkles className="h-3 w-3" />
          <span>Premium Fintech Experience</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
