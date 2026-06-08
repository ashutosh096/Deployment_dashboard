import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/storage";
import type { DeveloperProfile } from "@/types";

interface SessionContextValue {
  user: DeveloperProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DeveloperProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.getAppSession().then(session => {
      setUser(session);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const regUser = await storage.verifyUserLogin(email, password);
    if (!regUser) return false;
    const initials = regUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const profile: DeveloperProfile = {
      id: regUser.id,
      name: regUser.name,
      role: regUser.jobTitle,
      email: regUser.email,
      avatarInitials: initials,
      userRole: regUser.userRole,
    };
    await storage.saveAppSession(profile);
    setUser(profile);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await storage.clearAppSession();
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
