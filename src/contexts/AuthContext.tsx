import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  bio: string | null;
  mobile_number: string | null;
  date_of_birth: string | null;
  profile_completed: boolean;
  referral_code: string | null;
  referral_credit_cents: number;
  referred_by: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const PROFILE_FIELDS =
  "display_name, avatar_url, first_name, last_name, username, bio, mobile_number, date_of_birth, profile_completed, referral_code, referral_credit_cents, referred_by";

// Defer Supabase JS (~40 KiB gz) off the critical path. We resolve it once,
// then reuse the same client everywhere. Loaded just after first paint via
// requestIdleCallback so it never blocks LCP.
let supabasePromise: Promise<SupabaseClient> | null = null;
const getSupabase = (): Promise<SupabaseClient> => {
  if (!supabasePromise) {
    supabasePromise = import("@/integrations/supabase/client").then(
      (m) => m.supabase as unknown as SupabaseClient
    );
  }
  return supabasePromise;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    const supabase = await getSupabase();
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select(PROFILE_FIELDS).eq("user_id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!roleData);
    setProfile(
      (profileData as Profile) ?? {
        display_name: null,
        avatar_url: null,
        first_name: null,
        last_name: null,
        username: null,
        bio: null,
        mobile_number: null,
        date_of_birth: null,
        profile_completed: false,
        referral_code: null,
        referral_credit_cents: 0,
        referred_by: null,
      }
    );
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const boot = async () => {
      const supabase = await getSupabase();
      if (cancelled) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setTimeout(() => loadUserData(session.user.id), 0);
          } else {
            setIsAdmin(false);
            setProfile(null);
          }
          setLoading(false);
        }
      );
      unsubscribe = () => subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      setLoading(false);
    };

    const ric: any = (window as any).requestIdleCallback;
    const handle = ric
      ? ric(boot, { timeout: 1500 })
      : window.setTimeout(boot, 200);

    return () => {
      cancelled = true;
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
      else window.clearTimeout(handle as number);
      unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/complete-profile` },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
