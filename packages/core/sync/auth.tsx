// Opt-in identity. user===null && !loading means signed out; the whole app
// works in that state. The SDK stores the access token in memory and
// rehydrates from an httpOnly refresh cookie, so getCurrentUser() must run
// once on startup — during that round-trip `loading` is true.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { insforge } from "./insforge";

export interface AccountUser { id: string; email: string; name?: string }

interface AccountState {
  user: AccountUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountState>({
  user: null, loading: true, refresh: async () => {},
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await insforge.auth.getCurrentUser();
    // UserSchema (from @insforge/shared-schemas) has no top-level `name`;
    // display name lives under the nullable `profile` object instead.
    setUser(error || !data?.user ? null : {
      id: data.user.id, email: data.user.email, name: data.user.profile?.name ?? undefined,
    });
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <AccountContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountState {
  return useContext(AccountContext);
}
