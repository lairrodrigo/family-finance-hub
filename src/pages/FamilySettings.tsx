import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  ArrowLeft, 
  Plus, 
  Shield, 
  UserPlus, 
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FamilySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user) fetchFamilyData();
  }, [user]);

  useEffect(() => {
    if (family) setNewName(family.name);
  }, [family]);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      
      if (profile?.family_id) {
        const { data: fData, error: fError } = await supabase.from("families").select("*").eq("id", profile.family_id).single();
        if (fError) throw fError;
        setFamily(fData);

        const { data: mData, error: mError } = await supabase.from("profiles").select("*").eq("family_id", profile.family_id);
        if (mError) throw mError;
        setMembers(mData || []);
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados da família:", err);
      toast.error("Erro ao sincronizar dados da família.");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === family?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("families")
        .update({ name: newName })
        .eq("id", family.id);

      if (error) throw error;
      toast.success("Nome atualizado!");
      setFamily({ ...family, name: newName });
      setIsEditingName(false);
    } catch (err: any) {
      toast.error("Erro ao renomear: " + err.message);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || loading) return;

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id || user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

      console.log("Iniciando criação de família para usuário:", userId);

      // 1. Criar a Família
      const { data: newFamily, error: fError } = await supabase
        .from("families")
        .insert([{ name: familyName, created_by: userId }])
        .select()
        .single();

      if (fError) {
        console.error("Erro RLS/Database na criação da família:", fError);
        throw new Error("Erro de permissão ao criar família. Verifique as políticas de RLS.");
      }

      console.log("Família criada:", newFamily.id);

      // 2. Vincular o perfil à família
      const { error: pError } = await supabase
        .from("profiles")
        .update({ family_id: newFamily.id })
        .eq("user_id", userId);

      if (pError) throw pError;

      // 3. Atribuir papel de Admin (pode falhar por RLS, mas o vínculo já foi feito)
      try {
        await supabase.from("user_roles").insert([{ 
          user_id: userId, 
          family_id: newFamily.id, 
          role: 'admin' 
        }]);
      } catch (roleError) {
        console.warn("Aviso: Falha ao atribuir cargo administrativo, mas a família foi criada.", roleError);
      }
      
      toast.success("Família criada com sucesso!");
      await fetchFamilyData();
    } catch (err: any) {
      console.error("Falha crítica no fluxo de criação:", err);
      toast.error(err.message || "Erro inesperado ao criar família.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;

    setInviting(true);
    try {
      const { data: targetProfile, error: sError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("email", inviteEmail.toLowerCase().trim())
        .maybeSingle();

      if (sError) throw sError;
      
      if (!targetProfile) {
        toast.error("Usuário não encontrado. Peça para ele criar uma conta primeiro.");
        return;
      }

      if (members.some(m => m.user_id === targetProfile.user_id)) {
        toast.error("Este usuário já faz parte da família!");
        return;
      }

      const { error: lError } = await supabase
        .from("profiles")
        .update({ family_id: family.id })
        .eq("user_id", targetProfile.user_id);

      if (lError) throw lError;

      await supabase.from("user_roles").insert([{ 
        user_id: targetProfile.user_id, 
        family_id: family.id, 
        role: 'standard' 
      }]);

      toast.success(`${targetProfile.full_name || inviteEmail} adicionado à família!`);
      setInviteEmail("");
      fetchFamilyData();
    } catch (err: any) {
      toast.error("Erro ao adicionar membro: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  if (loading && !family) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-fade-in max-w-2xl mx-auto pb-32">
      <div className="flex items-center gap-5 px-4 md:px-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/more")} 
          className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 text-white transition-all shadow-xl"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Família</h1>
          <p className="text-sm font-medium text-white/20">Gerencie seu espaço compartilhado.</p>
        </div>
      </div>

      {!family ? (
        <Card className="p-10 border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] flex flex-col items-center text-center gap-8 shadow-2xl mx-4 md:mx-0">
          <div className="h-20 w-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
            <Users className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Crie seu Espaço</h2>
            <p className="text-sm font-medium text-white/20 max-w-xs">
              Para começar a usar o Divvy Money, você precisa criar um espaço para compartilhar com sua família.
            </p>
          </div>
          <form onSubmit={handleCreateFamily} className="w-full max-w-sm space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Nome do Espaço</Label>
              <Input 
                placeholder="Ex: Família Silva" 
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="h-16 text-center text-lg rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
              />
            </div>
            <Button type="submit" className="w-full h-16 rounded-[1.5rem] bg-white text-black text-lg font-bold shadow-2xl shadow-white/5 hover:bg-white/90 active:scale-[0.98] transition-all">
              Criar agora
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-8 px-4 md:px-0">
          <Card className="p-8 md:p-10 border border-white/[0.05] bg-[#0C0C0E] rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5 overflow-hidden">
                <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary shadow-xl">
                  <Shield className="h-7 w-7" />
                </div>
                <div className="flex-1 overflow-hidden">
                  {isEditingName ? (
                    <Input 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-10 py-0 px-2 font-bold text-xl bg-transparent border-none text-white focus-visible:ring-0"
                      autoFocus
                      onBlur={handleRename}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    />
                  ) : (
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                      <h2 className="text-2xl font-bold text-white tracking-tight truncate">{family.name}</h2>
                      <Plus className="h-5 w-5 rotate-45 text-white/10 group-hover:text-white transition-colors" />
                    </div>
                  )}
                  <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">Workspace Ativo</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Membros cadastrados</Label>
              <div className="grid gap-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.03]">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shadow-lg">
                        {member.full_name?.charAt(0) || member.email?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-white truncate max-w-[150px] leading-tight">{member.full_name || member.email}</p>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-white/20">{member.user_id === user?.id ? "Proprietário" : "Membro"}</p>
                      </div>
                    </div>
                    {member.user_id === user?.id && <CheckCircle2 className="h-5 w-5 text-[#22C55E] opacity-50" />}
                  </div>
                ))}
              </div>
              
              <div className="pt-6 border-t border-white/[0.05] space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Convidar por E-mail</Label>
                <form onSubmit={handleAddMember} className="flex gap-3">
                  <Input 
                    placeholder="exemplo@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    className="h-14 rounded-2xl bg-white/[0.02] border-white/[0.05] font-bold text-white placeholder:text-white/5 focus-visible:ring-primary/20 transition-all"
                    disabled={inviting}
                  />
                  <Button type="submit" className="h-14 rounded-2xl px-6 bg-white text-black font-bold shadow-xl hover:bg-white/90 active:scale-95 transition-all" disabled={inviting}>
                    {inviting ? "..." : <Plus className="h-6 w-6" />}
                  </Button>
                </form>
              </div>
            </div>
          </Card>
          
          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] flex items-start gap-4 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform hover:scale-110">
              <Info className="h-5 w-5" />
            </div>
            <p className="text-xs text-white/30 font-medium leading-relaxed">
              Dica: Membros de uma mesma família compartilham <span className="text-white/60">contas</span>, <span className="text-white/60">cartões</span> e <span className="text-white/60">metas</span>. Ideal para o orçamento da casa!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySettings;
