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

  // Function to load role and family
  const loadUserData = async (userId: string) => {
    try {
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('family_id, full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error("AuthContext: [DIAGNOSTIC] Erro ao carregar perfil:", profileError);
        if (profileError.code === 'PGRST116') {
          console.warn("AuthContext: Perfil não encontrado. Tentando aceitar convite...");
          await tryAcceptInvitation();
          
          const retry = await supabase
            .from('profiles')
            .select('family_id, full_name, avatar_url')
            .eq('user_id', userId)
            .single();
            
          if (retry.error) {
            console.error("AuthContext: Perfil ainda não encontrado após re-tentativa:", retry.error);
          } else {
            profileData = retry.data;
          }
        }
      }

      let currentFamilyId = profileData?.family_id ?? null;
      
      // AUTO-REPAIR: If family_id is null in profile, check if user has entries in user_roles
      if (!currentFamilyId && userId) {
        const { data: roleFallback, error: fallbackError } = await supabase
          .from('user_roles')
          .select('family_id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (fallbackError) {
          console.error("AuthContext: [DIAGNOSTIC] Erro no fallback de user_roles:", fallbackError);
        }

        if (roleFallback?.family_id) {
          console.log("[AuthContext] Auto-repair: vinculando profile ao family_id encontrado em user_roles:", roleFallback.family_id);
          currentFamilyId = roleFallback.family_id;
          await supabase
            .from('profiles')
            .update({ family_id: currentFamilyId })
            .eq('user_id', userId);
        }
      }


      setFamilyId(currentFamilyId);
      setProfile({
        full_name: profileData?.full_name ?? null,
        avatar_url: profileData?.avatar_url ?? null
      });

      if (currentFamilyId) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('family_id', currentFamilyId)
          .maybeSingle();

        if (roleError) {
          console.error("AuthContext: [DIAGNOSTIC] Erro ao carregar papel (role):", roleError);
        }
        
        const rawRole = roleData?.role;
        const normalizedRole = rawRole === 'standard' ? 'member' : rawRole ?? null;
        setRole(normalizedRole as 'admin' | 'member' | 'viewer' | null);
      } else {
        setRole(null);
      }
    } catch (err) {
      console.error("AuthContext: [DIAGNOSTIC] ERRO CRÍTICO em loadUserData:", err);
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
    }, 10000);

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
        
        if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
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
