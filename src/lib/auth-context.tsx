import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Organization, Profile } from "./types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  role: AppRole | null;
  isSuperAdmin: boolean;
  isOrganizationAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ROLE_CACHE_KEY = "shanyraq-role";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    supabase.auth.getSession().then(({ data: current }) => {
      setSession(current.session);
      setInitializing(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["auth-context", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profile = (profileRes.data as Profile | null) ?? null;
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const role: AppRole | null = roles.includes("SUPER_ADMIN")
        ? "SUPER_ADMIN"
        : roles.includes("ORGANIZATION_ADMIN")
          ? "ORGANIZATION_ADMIN"
          : (roles[0] ?? null);

      let organization: Organization | null = null;
      if (profile?.organization_id) {
        const orgRes = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .maybeSingle();
        organization = (orgRes.data as Organization | null) ?? null;
      }
      return { profile, role, organization };
    },
  });

  // Cached role keeps navigation stable while the role query resolves,
  // so an authenticated administrator is never rendered as a visitor.
  const [cachedRole, setCachedRole] = useState<AppRole | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCachedRole((window.localStorage.getItem(ROLE_CACHE_KEY) as AppRole | null) ?? null);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !data?.role) return;
    window.localStorage.setItem(ROLE_CACHE_KEY, data.role);
    setCachedRole(data.role);
  }, [data?.role]);

  const signOut = async () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(ROLE_CACHE_KEY);
    setCachedRole(null);
    await supabase.auth.signOut();
  };

  const loading = initializing || (!!userId && isLoading);
  const effectiveRole: AppRole | null = data?.role ?? (loading ? cachedRole : null);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    profile: data?.profile ?? null,
    organization: data?.organization ?? null,
    role: data?.role ?? null,
    isSuperAdmin: effectiveRole === "SUPER_ADMIN",
    isOrganizationAdmin: effectiveRole === "ORGANIZATION_ADMIN",
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
