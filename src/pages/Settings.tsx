import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  Users,
  Lock,
  Loader2,
  Pencil,
  Check,
  X,
  DollarSign,
  ExternalLink,
  Camera,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
    {children}
  </p>
);

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

const SettingsRow = ({
  icon: Icon,
  label,
  value,
  onClick,
  danger,
  badge,
  iconColor,
  disabled,
  children,
}: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || !onClick}
    className={cn(
      "group flex w-full items-center justify-between rounded-[1.5rem] p-5 transition-all",
      onClick && !disabled ? "cursor-pointer hover:bg-white/[0.03] active:scale-[0.98]" : "cursor-default",
      danger && "hover:bg-red-500/5",
    )}
  >
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.04]",
          danger ? "bg-red-500/5 text-red-400" : "bg-white/[0.03] text-muted-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="text-left">
        <p className={cn("text-sm font-bold", danger ? "text-red-400" : "text-white/80")}>{label}</p>
        {value && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{value}</p>}
        {children}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <Badge variant="outline" className="border-white/10 text-[9px] text-muted-foreground">
          {badge}
        </Badge>
      )}
      {onClick && !disabled && (
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform group-hover:translate-x-0.5",
            danger ? "text-red-400/40" : "text-muted-foreground",
          )}
        />
      )}
    </div>
  </button>
);

const getRoleLabel = (currentRole: string | null) => {
  switch (currentRole) {
    case "admin":
      return "Admin";
    case "member":
      return "Membro";
    case "viewer":
      return "Visualizador";
    default:
      return "Membro";
  }
};

const getAvatarUploadErrorMessage = (error: { message?: string; statusCode?: string | number } | null | undefined) => {
  const normalizedMessage = error?.message?.toLowerCase() || "";
  const normalizedStatus = String(error?.statusCode || "").toLowerCase();

  if (
    normalizedMessage.includes("bucket not found") ||
    normalizedMessage.includes("not found") ||
    normalizedStatus === "404"
  ) {
    return "O bucket 'avatars' ainda não existe no Supabase. Execute a migration/SQL de avatar primeiro.";
  }

  return error?.message || "Erro ao enviar a foto de perfil.";
};

const SettingsPage = () => {
  const { user, signOut, role } = useAuth();
  const { showValues, toggleShowValues } = useSettings();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      void fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("*, families(id, name)")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (prof) {
        setProfile(prof);
        setEditName(prof.full_name || "");

        if (prof.family_id) {
          const { data: fam, error: familyError } = await supabase
            .from("families")
            .select("id, name")
            .eq("id", prof.family_id)
            .single();

          if (familyError) throw familyError;
          setFamily(fam);

          const { count, error: countError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("family_id", prof.family_id);

          if (countError) throw countError;
          setMemberCount(count || 0);
        } else {
          setFamily(null);
          setMemberCount(0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user?.id || !editName.trim() || editName === profile?.full_name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim() })
        .eq("user_id", user.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Acesso negado: você não possui permissão para esta ação.");
      }

      setProfile((current) => (current ? { ...current, full_name: editName.trim() } : current));
      toast.success("Nome atualizado.");
      setIsEditingName(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarClick = () => {
    if (!uploadingAvatar) {
      avatarInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile || !user?.id) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Use uma imagem JPG ou PNG.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const previousPreviewUrl = avatarPreviewUrl;
    const localPreviewUrl = URL.createObjectURL(selectedFile);
    setAvatarPreviewUrl(localPreviewUrl);
    setUploadingAvatar(true);

    try {
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar.${fileExtension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, selectedFile, {
        cacheControl: "3600",
        contentType: selectedFile.type,
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current));

      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      toast.success("Foto de perfil atualizada.");
    } catch (err: any) {
      URL.revokeObjectURL(localPreviewUrl);
      setAvatarPreviewUrl(previousPreviewUrl ?? null);
      toast.error(getAvatarUploadErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error("Erro ao enviar e-mail de redefinição.");
      return;
    }

    toast.success("E-mail de redefinição de senha enviado!");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const avatarSrc = avatarPreviewUrl || profile?.avatar_url || undefined;
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 pb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      <div>
        <SectionLabel>Conta</SectionLabel>
        <Card className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl divide-y divide-white/[0.04]">
          <div className="flex items-center gap-5 p-6">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="group relative rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Alterar foto de perfil"
              >
                <Avatar className="h-16 w-16 rounded-2xl border border-primary/20 shadow-xl">
                  <AvatarImage src={avatarSrc} alt={`Avatar de ${displayName}`} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-lg">
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 rounded-xl border-white/[0.08] bg-white/[0.04] px-3 text-sm font-bold text-white transition-all focus-visible:ring-primary/30"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && void handleSaveName()}
                    disabled={savingName}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void handleSaveName()}
                    disabled={savingName}
                    className="h-9 w-9 rounded-xl text-green-400 hover:bg-green-500/10"
                  >
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(profile?.full_name || "");
                    }}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="group flex items-center gap-2">
                  <p className="truncate text-base font-bold text-white">{displayName}</p>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Editar nome"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-white" />
                  </button>
                </div>
              )}
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{user?.email}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Clique no avatar para enviar JPG ou PNG até 2MB
              </p>
            </div>
          </div>

          <SettingsRow icon={Mail} label="Endereço de E-mail" value={user?.email} />
        </Card>
      </div>

      <div>
        <SectionLabel>Família</SectionLabel>
        <Card className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl divide-y divide-white/[0.04]">
          {family ? (
            <SettingsRow
              icon={Users}
              label={family.name}
              value={`${memberCount} membro${memberCount !== 1 ? "s" : ""} · Workspace Ativo`}
              badge={getRoleLabel(role)}
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

      <div>
        <SectionLabel>Preferências</SectionLabel>
        <Card className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl divide-y divide-white/[0.04]">
          <button
            type="button"
            onClick={toggleShowValues}
            className="group flex w-full items-center justify-between rounded-t-[2.5rem] p-5 transition-all hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.03] text-muted-foreground">
                {showValues ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white/80">Exibir Valores</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {showValues ? "Valores visíveis" : "Saldos ocultados"}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "flex h-7 w-12 items-center rounded-full border px-1 transition-all duration-300",
                showValues ? "border-primary/30 bg-primary/20" : "border-white/[0.08] bg-white/[0.04]",
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 rounded-full shadow-md transition-all duration-300",
                  showValues ? "translate-x-5 bg-primary" : "translate-x-0 bg-white/20",
                )}
              />
            </div>
          </button>

          <SettingsRow icon={DollarSign} label="Moeda" value="Real Brasileiro (R$)" badge="BRL" />
        </Card>
      </div>

      <div>
        <SectionLabel>Segurança</SectionLabel>
        <Card className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl divide-y divide-white/[0.04]">
          <SettingsRow
            icon={Lock}
            label="Redefinir Senha"
            value="Enviar e-mail de redefinição"
            onClick={() => void handleResetPassword()}
          />
          <SettingsRow
            icon={ExternalLink}
            label="Gerenciar Família"
            value="Membros, papéis e permissões"
            onClick={() => navigate("/family")}
          />
        </Card>
      </div>

      <div>
        <SectionLabel>Sessão</SectionLabel>
        <Card className="overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] shadow-2xl">
          <SettingsRow
            icon={LogOut}
            label="Sair da Conta"
            value={signingOut ? "Saindo..." : "Encerrar sessão atual"}
            onClick={() => void handleSignOut()}
            danger
            disabled={signingOut}
          />
        </Card>
      </div>

      <div className="flex flex-col items-center gap-1 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Divvy Money</p>
        <p className="text-[9px] font-medium text-white/5">Gestão Financeira Compartilhada</p>
      </div>
    </div>
  );
};

export default SettingsPage;
