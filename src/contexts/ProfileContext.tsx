import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type ProfileName = "MonCon" | "AdC";

const PROFILE_KEYS: Record<ProfileName, string> = {
  MonCon: "BVMLP",
  AdC: "NSM",
};

const STORAGE_KEY = "simcon.profile";

interface ProfileContextValue {
  profile: ProfileName | null;
  isEditor: boolean;
  login: (profile: ProfileName, key: string) => boolean;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileName | null>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "MonCon" || v === "AdC" ? v : null;
  });

  useEffect(() => {
    if (profile) window.localStorage.setItem(STORAGE_KEY, profile);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [profile]);

  const login = useCallback((p: ProfileName, key: string) => {
    if (PROFILE_KEYS[p] === key) {
      setProfile(p);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setProfile(null), []);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, isEditor: profile !== null, login, logout }),
    [profile, login, logout],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
