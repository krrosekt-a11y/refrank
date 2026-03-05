import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseConfig";

export const AUTH_USER_KEY_STORAGE = "refscore_auth_user_key_v1";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ requiresEmailVerification: boolean }>;
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuthUserKey(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user?.id) {
    window.localStorage.setItem(AUTH_USER_KEY_STORAGE, user.id);
    return;
  }
  window.localStorage.removeItem(AUTH_USER_KEY_STORAGE);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = Boolean(supabase);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setUser(null);
      persistAuthUserKey(null);
      return;
    }

    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.user ?? null);
        persistAuthUserKey(data.user ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      persistAuthUserKey(nextUser);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      async signIn(email: string, password: string) {
        if (!supabase) throw new Error("Supabase auth yapılandırılmamış.");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      async signUp(email: string, password: string, fullName?: string) {
        if (!supabase) throw new Error("Supabase auth yapılandırılmamış.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: fullName ? { full_name: fullName } : undefined,
          },
        });
        if (error) throw error;
        const requiresEmailVerification = !data.session;
        return { requiresEmailVerification };
      },
      async updateProfile(data: Record<string, unknown>) {
        if (!supabase) throw new Error("Supabase auth yapılandırılmamış.");
        const { error } = await supabase.auth.updateUser({ data });
        if (error) throw error;
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [configured, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
