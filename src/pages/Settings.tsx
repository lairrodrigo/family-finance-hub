import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Shield, LogOut, Eye, EyeOff, ChevronRight,
  Users, Lock, Loader2, Pencil, Check, X, Bell, DollarSign, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------
// Sub-component: Section Header
// ----------------------------------------------------------
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 px-1 mb-3">
    {children}
  </p>
);

// ----------------------------------------------------------
// Sub-component: Settings Row
// ----------------------------------------------------------
interface RowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  badge?: string;
  iconColor?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const SettingsRow = ({ icon: Icon, label, value, onClick, danger, badge, iconColor, disabled, children }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || !onClick}
    className={cn(
      "w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all group",
      onClick && !disabled ? "hover:bg-white/[0.03] cursor-pointer active:scale-[0.98]" : "cursor-default",
      danger && "hover:bg-red-500/5"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.04]",
        danger ? "bg-red-500/5 text-red-400" : "bg-white/[0.03] text-white/30"
      )}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="text-left">
        <p className={cn("text-sm font-bold", danger ? "text-red-400" : "text-white/80")}>{label}</p>
        {value && <p className="text-xs text-white/20 mt-0.5 font-medium">{value}</p>}
        {children}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {badge && <Badge variant="outline" className="text-[9px] border-white/10 text-white/20">{badge}</Badge>}
      {onClick && !disabled && (
        <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", danger ? "text-red-400/40" : "text-white/10")} />
      )}
    </div>
  </button>
);

// ----------------------------------------------------------
// Main Page
// ----------------------------------------------------------
const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { showValues, toggleShowValues } = useSettings();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Profile edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*, families(id, name)")
        .eq("user_id", user!.id)
        .single();

      if (prof) {
        setProfile(prof);
        setEditName(prof.full_name || "");

        if (prof.family_id) {
          const { data: fam } = await supabase
            .from("families")
            .select("id, name")
            .eq("id", prof.family_id)
            .single();
          setFamily(fam);

          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("family_id", prof.family_id);
          setMemberCount(count || 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName === profile?.full_name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim() })
        .eq("user_id", user!.id);
      if (error) throw error;
      setProfile({ ...profile, full_name: editName.trim() });
      toast.success("Nome atualizado.");
      setIsEditingName(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error("Erro ao enviar e-mail de redefinição.");
    else toast.success("E-mail de redefinição de senha enviado!");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/10" />
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="flex flex-col gap-10 max-w-2xl mx-auto pb-32 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configurações</h1>
        <p className="text-sm font-medium text-white/20 mt-1">Gerencie sua conta e preferências.</p>
      </div>

      {/* ── Seção 1: Conta do Usuário ── */}
      <div>
        <SectionLabel>Conta</SectionLabel>
        <Card className="border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] overflow-hidden shadow-2xl divide-y divide-white/[0.04]">

          {/* Avatar + Nome */}
          <div className="p-6 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shadow-xl shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-white/[0.04] border-white/[0.08] text-white font-bold text-sm focus-visible:ring-primary/30 transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    disabled={savingName}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName} className="h-9 w-9 text-green-400 hover:bg-green-500/10 rounded-xl">
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setEditName(profile?.full_name || ""); }} className="h-9 w-9 text-white/20 hover:bg-white/5 rounded-xl">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-bold text-white truncate">{displayName}</p>
                  <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3.5 w-3.5 text-white/30 hover:text-white transition-colors" />
                  </button>
                </div>
              )}
              <p className="text-xs text-white/20 font-medium mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* E-mail (somente leitura) */}
          <SettingsRow
            icon={Mail}
            label="Endereço de E-mail"
            value={user?.email}
          />
        </Card>
      </div>

      {/* ── Seção 2: Família ── */}
      <div>
        <SectionLabel>Família</SectionLabel>
        <Card className="border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] overflow-hidden shadow-2xl divide-y divide-white/[0.04]">
          {family ? (
            <SettingsRow
              icon={Users}
              label={family.name}
              value={`${memberCount} membro${memberCount !== 1 ? "s" : ""} · Workspace Ativo`}
              badge="Admin"
              onClick={() => navigate("/family")}
            />
          ) : (
            <SettingsRow
              icon={Users}
              label="Sem família vinculada"
              value="Crie ou entre em um espaço compartilhado"
              onClick={() => navigate("/family")}
            />
          )}
        </Card>
      </div>

      {/* ── Seção 3: Preferências ── */}
      <div>
        <SectionLabel>Preferências</SectionLabel>
        <Card className="border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] overflow-hidden shadow-2xl divide-y divide-white/[0.04]">

          {/* Ocultar valores */}
          <button
            type="button"
            onClick={toggleShowValues}
            className="w-full flex items-center justify-between p-5 rounded-t-[2.5rem] hover:bg-white/[0.03] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-white/30">
                {showValues ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white/80">Exibir Valores</p>
                <p className="text-xs text-white/20 mt-0.5 font-medium">{showValues ? "Valores visíveis" : "Saldos ocultados"}</p>
              </div>
            </div>
            {/* Toggle visual */}
            <div className={cn(
              "h-7 w-12 rounded-full border transition-all duration-300 flex items-center px-1",
              showValues ? "bg-primary/20 border-primary/30" : "bg-white/[0.04] border-white/[0.08]"
            )}>
              <div className={cn(
                "h-5 w-5 rounded-full transition-all duration-300 shadow-md",
                showValues ? "translate-x-5 bg-primary" : "translate-x-0 bg-white/20"
              )} />
            </div>
          </button>

          {/* Moeda */}
          <SettingsRow
            icon={DollarSign}
            label="Moeda"
            value="Real Brasileiro (R$)"
            badge="BRL"
          />
        </Card>
      </div>

      {/* ── Seção 4: Segurança ── */}
      <div>
        <SectionLabel>Segurança</SectionLabel>
        <Card className="border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] overflow-hidden shadow-2xl divide-y divide-white/[0.04]">
          <SettingsRow
            icon={Lock}
            label="Redefinir Senha"
            value="Enviar e-mail de redefinição"
            onClick={handleResetPassword}
          />
          <SettingsRow
            icon={ExternalLink}
            label="Gerenciar Familia"
            value="Membros, papéis e permissões"
            onClick={() => navigate("/family")}
          />
        </Card>
      </div>

      {/* ── Seção 5: Sessão ── */}
      <div>
        <SectionLabel>Sessão</SectionLabel>
        <Card className="border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <SettingsRow
            icon={LogOut}
            label="Sair da Conta"
            value={signingOut ? "Saindo..." : "Encerrar sessão atual"}
            onClick={handleSignOut}
            danger
            disabled={signingOut}
          />
        </Card>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-1 pb-4">
        <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">Divvy Money</p>
        <p className="text-[9px] text-white/5 font-medium">Gestão Financeira Compartilhada</p>
      </div>
    </div>
  );
};

export default SettingsPage;
