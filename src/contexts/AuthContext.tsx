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
        throw profileError;
      }

      if (!profileData?.family_id) {
        await tryAcceptInvitation();

        const profileReload = await supabase
          .from('profiles')
          .select('family_id, full_name, avatar_url')
          .eq('user_id', userId)
          .single();

        if (profileReload.error) {
          throw profileReload.error;
        }

        profileData = profileReload.data;
      }

      const currentFamilyId = profileData?.family_id ?? null;
      setFamilyId(currentFamilyId);
      setProfile({
        full_name: profileData?.full_name ?? null,
        avatar_url: profileData?.avatar_url ?? null
      });

      if (currentFamilyId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('family_id', currentFamilyId)
          .maybeSingle();

        const rawRole = roleData?.role;
        const normalizedRole = rawRole === 'standard' ? 'member' : rawRole ?? null;
        setRole(normalizedRole as 'admin' | 'member' | 'viewer' | null);
      } else {
        setRole(null);
      }
    } catch (err) {
      console.error("Error loading extended auth data:", err);
    }
  };

  const refreshAuth = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization safety timeout reached. Forcing loading = false.");
        setLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Use setTimeout to avoid deadlock in some Supabase SDK versions
        setTimeout(async () => {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
            try {
              await loadUserData(currentUser.id);
            } catch (err) {
              console.error("loadUserData failed in onAuthStateChange:", err);
            }
          } else {
            setRole(null);
            setFamilyId(null);
            setProfile(null);
          }
          
          setLoading(false);
          clearTimeout(safetyTimeout);
        }, 0);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        try {
          await loadUserData(currentUser.id);
        } catch (err) {
          console.error("loadUserData failed in getSession:", err);
        }
      }
      
      setLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(err => {
      console.error("Critical error getting session:", err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
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
