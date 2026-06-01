"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { type AuthUser } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const PUBLIC_ROUTES = ["/login", "/"];

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        if (!PUBLIC_ROUTES.includes(pathname)) router.replace("/login");
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const u = await res.json();
          if (!cancelled) {
            setUser(u);
            setLoading(false);
          }
        } else {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          if (!PUBLIC_ROUTES.includes(pathname)) router.replace("/login");
          if (!cancelled) setLoading(false);
        }
      } catch {
        if (!cancelled) {
          if (!PUBLIC_ROUTES.includes(pathname)) router.replace("/login");
          setLoading(false);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
