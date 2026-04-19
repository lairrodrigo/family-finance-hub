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
  profileLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Helper: wraps a promise with a timeout so Supabase queries never hang indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const tryAcceptInvitation = async () => {
    try {
      await supabase.rpc('accept_my_family_invitation');
    } catch (err) {
      console.error("Error accepting family invitation:", err);
    }
  };

  // Loads profile + role in background. Never blocks the auth loading gate.
  const loadUserData = async (userId: string) => {
    setProfileLoading(true);
    try {
      // Run both queries in parallel with 8s timeout each
      const TIMEOUT_MS = 8000;
      const [profileResult, rolesResult] = await Promise.all([
        withTimeout(
          supabase.from('profiles').select('family_id, full_name, avatar_url').eq('user_id', userId).single(),
          TIMEOUT_MS,
          { data: null, error: { message: 'timeout', code: 'TIMEOUT' } }
        ),
        withTimeout(
          supabase.from('user_roles').select('family_id, role').eq('user_id', userId).limit(1).maybeSingle(),
          TIMEOUT_MS,
          { data: null, error: { message: 'timeout', code: 'TIMEOUT' } }
        ),
      ]);

      let profileData = profileResult.data;

      // Profile not found → try accepting pending invitation
      if (profileResult.error?.code === 'PGRST116') {
        await tryAcceptInvitation();
        const retry = await withTimeout(
          supabase.from('profiles').select('family_id, full_name, avatar_url').eq('user_id', userId).single(),
          TIMEOUT_MS,
          { data: null, error: null }
        );
        if (!retry.error) profileData = retry.data;
      }

      // family_id: prefer profile, fallback to user_roles
      const currentFamilyId = profileData?.family_id ?? rolesResult.data?.family_id ?? null;

      // Auto-repair: sync profile if link was broken
      if (!profileData?.family_id && currentFamilyId) {
        supabase.from('profiles').update({ family_id: currentFamilyId }).eq('user_id', userId);
      }

      const rawRole = rolesResult.data?.role;
      const normalizedRole = rawRole === 'standard' ? 'member' : (rawRole as 'admin' | 'member' | 'viewer' | null) ?? null;

      setFamilyId(currentFamilyId);
      setProfile({ full_name: profileData?.full_name ?? null, avatar_url: profileData?.avatar_url ?? null });
      setRole(currentFamilyId ? normalizedRole : null);
    } catch (err) {
      console.error('[AuthContext] loadUserData error:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshAuth = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // ✅ Release the main loading gate IMMEDIATELY after session is known.
        // Profile data loads in background via loadUserData (fire-and-forget).
        setLoading(false);

        if (currentUser) {
          loadUserData(currentUser.id); // intentionally not awaited
        } else {
          setProfileLoading(false);
        }
      } catch (err) {
        console.error("AuthContext: Error during initialization:", err);
        if (mounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN') {
          // On explicit sign-in, load profile (await so Home has data immediately)
          if (currentUser) await loadUserData(currentUser.id);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && currentUser) {
          // Refresh silently in background
          loadUserData(currentUser.id);
        } else if (event === 'SIGNED_OUT') {
          setRole(null);
          setFamilyId(null);
          setProfile(null);
          setProfileLoading(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      familyId, 
      profile,
      loading,
      profileLoading,
      signUp, 
      signIn, 
      signOut,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }
}
