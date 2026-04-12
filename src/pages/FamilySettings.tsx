import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Plus, Shield, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
    // ... same logic but ensure it's up to date
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("user_id", user?.id).single();
      if (profile?.family_id) {
        const { data: fData } = await supabase.from("families").select("*").eq("id", profile.family_id).single();
        setFamily(fData);
        const { data: mData } = await supabase.from("profiles").select("*").eq("family_id", profile.family_id);
        setMembers(mData || []);
      }
    } catch (err) {
      console.error(err);
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
    // ... keep existing robust handleCreateFamily ...
    e.preventDefault();
    if (!familyName.trim()) return;

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id || user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const { data: newFamily, error: fError } = await supabase
        .from("families")
        .insert([{ name: familyName, created_by: userId }])
        .select()
        .single();

      if (fError) throw fError;

      await supabase.from("profiles").update({ family_id: newFamily.id }).eq("user_id", userId);
      await supabase.from("user_roles").insert([{ user_id: userId, family_id: newFamily.id, role: 'admin' }]);
      
      toast.success("Família criada com sucesso!");
      await fetchFamilyData();
    } catch (err: any) {
      toast.error("Erro ao criar família: " + err.message);
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in max-w-2xl mx-auto md:pt-4 px-4 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/more")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Família</h1>
          <p className="text-sm text-muted-foreground">Gerencie o seu espaço de trabalho compartilhado.</p>
        </div>
      </div>

      {!family ? (
        <Card className="p-8 border-dashed border-2 bg-muted/30 flex flex-col items-center text-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Você não tem uma família ainda</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Para começar a usar o DivvyMoney, você precisa criar um espaço para compartilhar com sua família.
            </p>
          </div>
          <form onSubmit={handleCreateFamily} className="w-full max-w-sm space-y-4">
            <Input 
              placeholder="Nome da sua família (ex: Família Silva)" 
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="h-12 text-center text-lg rounded-xl"
            />
            <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold">
              Criar Família
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6 bg-card border-none shadow-xl shadow-primary/5 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 py-0 px-2 font-bold text-lg"
                        autoFocus
                        onBlur={handleRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold truncate">{family.name}</h2>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsEditingName(true)}>
                        <Plus className="h-3 w-3 rotate-45" />
                      </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Workspace Ativo</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Membros</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {member.full_name?.charAt(0) || "? "}
                      </div>
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[150px]">{member.full_name || member.email}</p>
                        <p className="text-[10px] text-muted-foreground">{member.user_id === user?.id ? "Você" : "Membro"}</p>
                      </div>
                    </div>
                    {member.user_id === user?.id && <CheckCircle2 className="h-4 w-4 text-success" />}
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleAddMember} className="flex gap-2">
                <Input 
                  placeholder="E-mail do usuário"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  type="email"
                  className="rounded-xl h-11"
                  disabled={inviting}
                />
                <Button type="submit" size="default" className="rounded-xl px-6 shrink-0 font-bold" disabled={inviting}>
                  {inviting ? "Adicionando..." : "Adicionar"}
                </Button>
              </form>
            </div>
          </Card>
          
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
            <Plus className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dica: Membros de uma mesma família compartilham contas bancárias, cartões e metas. Ideal para controlar o orçamento da casa juntos!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySettings;
