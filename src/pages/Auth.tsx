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
      console.log("Auth: Attempting login for", email);
      const { error } = await signIn(email, password);
      if (error) {
        console.error("Auth: Login failed:", error);
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } else {
      console.log("Auth: Attempting signup for", email);
      const { error } = await signUp(email, password, fullName);
      if (error) {
        console.error("Auth: Signup failed:", error);
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="app-shell relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(91,140,255,0.16),transparent_30%),linear-gradient(180deg,transparent,rgba(2,6,23,0.24))]" />

      <div className="z-10 space-y-10" style={{ width: "min(28rem, calc(100vw - 3rem))" }}>
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <AppLogo size={80} className="hover:scale-110 transition-transform duration-500" />
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">Divvy Money</h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">
              {isLogin ? "Sua Vida Financeira Unificada" : "Comece sua Jornada"}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="premium-panel animate-in space-y-8 rounded-[1.5rem] p-8 duration-700 fade-in zoom-in-95 sm:p-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">{isLogin ? "Bem-vindo de volta" : "Criar nova conta"}</h2>
            <p className="text-sm text-muted-foreground font-medium">Preencha seus dados para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Nome Completo</Label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-16 pl-14 font-bold"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Endereço de E-mail</Label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 pl-14 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Senha Segura</Label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-16 pl-14 font-bold"
                />
              </div>
            </div>

            <Button type="submit" className="mt-4 h-[4.5rem] w-full gap-4 rounded-[1.5rem] py-8 text-xl font-extrabold" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : isLogin ? "Entrar agora" : "Cadastrar conta"}
            </Button>
          </form>

          {/* Toggle Button */}
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold tracking-tight text-muted-foreground transition-all hover:text-white"
            >
              {isLogin ? "Não tem uma conta? " : "Já possui cadastro? "}
              <span className="text-primary hover:underline">{isLogin ? "Cadastre-se grátis" : "Fazer Login"}</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Premium Fintech Experience</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;


