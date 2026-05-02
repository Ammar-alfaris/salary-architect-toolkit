import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  defaultCurrency: string;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshOrg: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadOrg(sess.user!.id), 0);
      } else {
        setOrganizationId(null);
        setDefaultCurrency("USD");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadOrg(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadOrg(uid: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    const orgId = data?.organization_id ?? null;
    setOrganizationId(orgId);
    if (orgId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("default_currency")
        .eq("id", orgId)
        .maybeSingle();
      setDefaultCurrency(org?.default_currency || "USD");
    }
  }

  const refreshOrg = async () => {
    if (user) await loadOrg(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrganizationId(null);
    setDefaultCurrency("USD");
  };

  return (
    <AuthContext.Provider value={{ user, session, organizationId, defaultCurrency, loading, signOut, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
