import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FamilyRecord {
  id: string;
  name: string;
}

interface MemberRecord {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

interface PendingInvite {
  created_at?: string;
  id: string;
  email: string;
}

const FamilySettings = () => {
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();
  const { isAdmin } = usePermissions();
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyRecord | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (user) {
      void fetchFamilyData();
    }
  }, [user]);

  useEffect(() => {
    if (family) setNewName(family.name);
  }, [family]);

  const fetchPendingInvites = async () => {
    try {
      if (!family?.id || !isAdmin) {
        setPendingInvites([]);
        return;
      }

      const { data, error } = await supabase.rpc("list_family_pending_invitations", {
        p_family_id: family.id,
      });

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (err) {
      console.error("Erro ao carregar convites:", err);
    }
  };

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();

      if (!profile?.family_id) {
        setFamily(null);
        setMembers([]);
        return;
      }

      const { data: familyData, error: familyError } = await supabase
        .from("families")
        .select("id, name")
        .eq("id", profile.family_id)
        .single();

      if (familyError) throw familyError;
      setFamily(familyData);

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("family_id", profile.family_id);

      if (rolesError) throw rolesError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("family_id", profile.family_id);

      if (profilesError) throw profilesError;

      const combinedMembers = (profilesData || []).map((memberProfile) => ({
        ...memberProfile,
        role: rolesData?.find((roleItem) => roleItem.user_id === memberProfile.user_id)?.role || "member",
      }));

      setMembers(combinedMembers);
      if (isAdmin) {
        const { data: invitesData, error: invitesError } = await supabase.rpc("list_family_pending_invitations", {
          p_family_id: profile.family_id,
        });

        if (invitesError) throw invitesError;
        setPendingInvites(invitesData || []);
      } else {
        setPendingInvites([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da família:", err);
      toast.error("Erro ao sincronizar dados da família.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!isAdmin || !family) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .update({ role: newRole as "admin" | "member" | "viewer" })
        .eq("user_id", targetUserId)
        .eq("family_id", family.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: você não possui permissão para esta ação.");
      toast.success("Papel atualizado com sucesso!");
      await fetchFamilyData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao alterar papel.";
      toast.error("Erro ao alterar papel: " + message);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!isAdmin || !family) return;
    if (!window.confirm("Tem certeza que deseja remover este membro da família?")) return;

    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("family_id", family.id)
        .select();

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) throw new Error("Acesso negado: você não possui permissão para esta ação.");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .update({ family_id: null })
        .eq("user_id", targetUserId)
        .select();

      if (profileError) throw profileError;
      if (!profileData || profileData.length === 0) throw new Error("Acesso negado: você não possui permissão para esta ação.");

      toast.success("Membro removido.");
      await fetchFamilyData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao remover.";
      toast.error("Erro ao remover: " + message);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.rpc("cancel_family_invitation", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      toast.success("Convite cancelado.");
      await fetchPendingInvites();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar.";
      toast.error("Erro ao cancelar: " + message);
    }
  };

  const handleRename = async () => {
    if (!isAdmin || !family) return;
    if (!newName.trim() || newName === family.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("families")
        .update({ name: newName })
        .eq("id", family.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Acesso negado: você não possui permissão para esta ação.");
      toast.success("Nome atualizado!");
      setFamily({ ...family, name: newName });
      setIsEditingName(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao renomear.";
      toast.error("Erro ao renomear: " + message);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || loading) return;

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

      const { data: newFamily, error: familyError } = await supabase
        .from("families")
        .insert([{ name: familyName, created_by: userId }])
        .select()
        .single();

      if (familyError) throw new Error("Erro de permissão ao criar família.");

      await supabase.from("profiles").update({ family_id: newFamily.id }).eq("user_id", userId);
      await supabase.from("user_roles").insert([{ user_id: userId, family_id: newFamily.id, role: "admin" }]);

      toast.success("Família criada com sucesso!");
      await refreshAuth();
      await fetchFamilyData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.toLowerCase().trim();
    if (!cleanEmail || inviting || !isAdmin || !family) return;

    setInviting(true);
    try {
      if (members.some((member) => member.email?.toLowerCase() === cleanEmail)) {
        toast.error("Já faz parte da família!");
        setInviting(false);
        return;
      }

      const { data, error } = await supabase.rpc("invite_family_member", {
        p_email: cleanEmail,
        p_family_id: family.id,
        p_role: "member",
      });

      if (error) throw error;

      if (data?.status === "linked") {
        toast.success(`${data.full_name || cleanEmail} adicionado diretamente!`);
      } else {
        toast.success(`Convite enviado para ${cleanEmail}!`);
      }

      setInviteEmail("");
      await fetchPendingInvites();
      await fetchFamilyData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao convidar.";
      toast.error("Erro ao convidar: " + message);
    } finally {
      setInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-3 w-3 text-primary" />;
      case "member":
        return <ShieldAlert className="h-3 w-3 text-muted-foreground" />;
      case "viewer":
        return <Eye className="h-3 w-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "member":
        return "Membro";
      case "viewer":
        return "Visualizador";
      default:
        return role;
    }
  };

  if (loading && !family) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 animate-fade-in pb-8">
      <div className="flex items-center gap-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/more")}
          className="h-12 w-12 rounded-2xl border border-white/[0.05] bg-white/[0.03] text-white shadow-xl transition-all hover:bg-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Família</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gestão de acesso e membros</p>
        </div>
      </div>

      {!family ? (
        <Card className="flex flex-col items-center gap-8 rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-10 text-center shadow-2xl">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2.5rem] border border-primary/20 bg-primary/10 text-primary shadow-xl">
            <Users className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">Crie seu Espaço</h2>
            <p className="max-w-xs text-sm font-medium leading-relaxed text-muted-foreground">
              Para começar a usar o Divvy Money, você precisa criar um espaço para compartilhar com sua família.
            </p>
          </div>
          <form onSubmit={handleCreateFamily} className="w-full max-w-sm space-y-6">
            <div className="space-y-3">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nome do Espaço</Label>
              <Input
                placeholder="Ex: Família Silva"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="h-16 rounded-2xl border-white/[0.05] bg-white/[0.02] text-center text-lg font-black text-white placeholder:text-white/5 transition-all focus-visible:ring-primary/20"
              />
            </div>
            <Button type="submit" className="h-16 w-full rounded-[1.5rem] bg-white text-sm font-black uppercase tracking-widest text-black shadow-2xl shadow-white/5 transition-all hover:bg-white/90 active:scale-[0.98]">
              Criar agora
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border border-white/[0.05] bg-[#0C0C0E] p-8 shadow-2xl md:p-10">
            <div className="mb-10 flex items-center justify-between">
              <div className="flex items-center gap-5 overflow-hidden">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.03] text-primary shadow-xl">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="flex-1 overflow-hidden">
                  {isEditingName && isAdmin ? (
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-10 border-none bg-transparent px-2 py-0 text-xl font-black text-white focus-visible:ring-0"
                      autoFocus
                      onBlur={handleRename}
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    />
                  ) : (
                    <div className={cn("group flex items-center gap-3", isAdmin && "cursor-pointer")} onClick={() => isAdmin && setIsEditingName(true)}>
                      <h2 className="truncate text-2xl font-black tracking-tight text-white">{family.name}</h2>
                      {isAdmin && <Plus className="h-5 w-5 rotate-45 text-muted-foreground transition-colors group-hover:text-white" />}
                    </div>
                  )}
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Workspace Ativo</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Membros cadastrados</Label>
              <div className="grid gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.03] sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-black text-primary shadow-lg">
                        {member.full_name?.charAt(0) || member.email?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="max-w-[150px] truncate text-sm font-black leading-tight text-white">{member.full_name || member.email}</p>
                          {member.user_id === user?.id && <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Você</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {getRoleIcon(member.role)}
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{getRoleLabel(member.role)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isAdmin && member.user_id !== user?.id && (
                        <>
                          <Select value={member.role} onValueChange={(value) => handleRoleChange(member.user_id, value)}>
                            <SelectTrigger className="h-9 w-32 rounded-xl border-none bg-white/5 text-[9px] font-black uppercase tracking-widest focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/5 bg-[#0C0C0E]">
                              <SelectItem value="admin" className="py-3 text-[10px] font-black uppercase tracking-widest">Admin</SelectItem>
                              <SelectItem value="member" className="py-3 text-[10px] font-black uppercase tracking-widest">Membro</SelectItem>
                              <SelectItem value="viewer" className="py-3 text-[10px] font-black uppercase tracking-widest">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {member.user_id === user?.id && <CheckCircle2 className="h-5 w-5 text-[#22C55E]/40" />}
                    </div>
                  </div>
                ))}
              </div>

              {pendingInvites.length > 0 && (
                <div className="space-y-4 border-t border-white/[0.05] pt-8">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Convites Pendentes</Label>
                  <div className="grid gap-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-white/[0.03] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500/40">
                            <UserPlus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-tight text-white">{invite.email}</p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-500/40">Aguardando Registro</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-white/5 transition-all hover:bg-red-500/10 hover:text-red-500"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-4 border-t border-white/[0.05] pt-8">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Convidar por E-mail</Label>
                  <form onSubmit={handleAddMember} className="flex gap-3">
                    <Input
                      placeholder="exemplo@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      type="email"
                      className="h-14 rounded-2xl border-white/[0.05] bg-white/[0.02] font-black text-white placeholder:text-white/5 transition-all focus-visible:ring-primary/20"
                      disabled={inviting}
                    />
                    <Button type="submit" className="h-14 rounded-2xl bg-white px-6 font-black text-black shadow-xl transition-all hover:bg-white/90 active:scale-95" disabled={inviting}>
                      {inviting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-start gap-4 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
              Admins podem gerenciar tudo. Membros lançam gastos. <span className="text-muted-foreground">Visualizadores</span> acompanham o progresso sem alterar dados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySettings;
