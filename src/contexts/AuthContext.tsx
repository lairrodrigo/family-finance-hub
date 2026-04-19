import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'member' | 'viewer' | null;
  familyId: string | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const tryAcceptInvitation = async () => {
    try {
      const { error } = await supabase.rpc('accept_my_family_invitation');
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Error accepting family invitation:", err);
    }
  };

  // Otimizado: roda queries em paralelo para reduzir latência
  const loadUserData = async (userId: string) => {
    try {
      // Busca perfil e roles em PARALELO (uma só roundtrip de rede cada)
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('family_id, full_name, avatar_url').eq('user_id', userId).single(),
        supabase.from('user_roles').select('family_id, role').eq('user_id', userId).maybeSingle()
      ]);

      let profileData = profileResult.data;

      // Perfil não encontrado → tenta aceitar convite pendente
      if (profileResult.error?.code === 'PGRST116') {
        await tryAcceptInvitation();
        const retry = await supabase.from('profiles').select('family_id, full_name, avatar_url').eq('user_id', userId).single();
        if (!retry.error) profileData = retry.data;
      }

      // family_id vem do perfil; fallback para user_roles se estiver nulo
      let currentFamilyId = profileData?.family_id ?? rolesResult.data?.family_id ?? null;

      // Auto-repair: sincroniza o perfil se o vínculo estava quebrado
      if (!profileData?.family_id && currentFamilyId) {
        console.log('[AuthContext] Auto-repair: corrigindo family_id no perfil.');
        supabase.from('profiles').update({ family_id: currentFamilyId }).eq('user_id', userId);
      }

      const rawRole = rolesResult.data?.role;
      const normalizedRole = rawRole === 'standard' ? 'member' : (rawRole as 'admin' | 'member' | 'viewer' | null) ?? null;

      setFamilyId(currentFamilyId);
      setProfile({ full_name: profileData?.full_name ?? null, avatar_url: profileData?.avatar_url ?? null });
      setRole(currentFamilyId ? normalizedRole : null);
    } catch (err) {
      console.error('[AuthContext] Erro em loadUserData:', err);
    }
  };

  const refreshAuth = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("AuthContext: Initialization safety timeout reached.");
        setLoading(false);
      }
    }, 30000); // 30s para conexões lentas (ex: Vercel cold start)

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await loadUserData(currentUser.id);
        }
      } catch (err) {
        console.error("AuthContext: Error during initialization:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await loadUserData(currentUser.id);
        } else if (event === 'SIGNED_OUT') {
          setRole(null);
          setFamilyId(null);
          setProfile(null);
        }
        
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      familyId, 
      profile,
      loading, 
      signUp, 
      signIn, 
      signOut,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}
