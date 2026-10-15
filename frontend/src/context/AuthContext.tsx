import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setUnauthorizedHandler } from "@/api/client";
import { authApi } from "@/api/services";
import type { AuthUser, Role } from "@/api/types";

type Status = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const clear = useCallback(() => {
    setUser(null);
    setStatus("guest");
  }, []);

  // Restore the session from the httpOnly cookie, and log out in the UI whenever the API says 401.
  useEffect(() => {
    setUnauthorizedHandler(clear);
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((me) => {
        setUser(me);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) clear();
      });

    return () => {
      controller.abort();
      setUnauthorizedHandler(null);
    };
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await authApi.login(email, password));
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setUser(await authApi.register(username, email, password));
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout(); // throws if the server could not revoke the token; the caller shows the error
    clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** For pages that sit behind <ProtectedRoute>, where the user is guaranteed to exist. */
export function useCurrentUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser called without a signed-in user");
  return user;
}
