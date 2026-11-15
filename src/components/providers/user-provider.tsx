"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";

interface UserContextValue {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  role: Profile["role"] | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const u = data?.user ?? null;
    setUser(u);
    if (u) {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(p as Profile | null);
    } else {
      setProfile({
        id: "demo-admin",
        email: "demo@local",
        full_name: "Demo Admin",
        role: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
    window.location.href = "/login";
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, role: profile?.role ?? null, refresh: load, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be within UserProvider");
  return ctx;
}
