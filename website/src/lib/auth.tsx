import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession, fetchUserAttributes, signOut as amplifySignOut } from 'aws-amplify/auth';

export type Role = 'professor' | 'admin' | 'student';

export type AuthState = {
  ready: boolean;
  signedIn: boolean;
  sub?: string;
  email?: string;
  name?: string;
  identityId?: string;
  groups: string[];
  isStaff: boolean;
  isProfessor: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'refresh' | 'signOut'>>({
    ready: false,
    signedIn: false,
    groups: [],
    isStaff: false,
    isProfessor: false,
  });

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken;
      if (!token) {
        setState({ ready: true, signedIn: false, groups: [], isStaff: false, isProfessor: false, identityId: session.identityId });
        return;
      }
      const groups = ((token.payload['cognito:groups'] as string[] | undefined) ?? []).map(String);
      let attrs: Record<string, string | undefined> = {};
      try {
        attrs = await fetchUserAttributes();
      } catch {
        /* attributes are optional */
      }
      setState({
        ready: true,
        signedIn: true,
        sub: String(token.payload.sub),
        email: attrs.email ?? String(token.payload.email ?? ''),
        name: attrs.name,
        identityId: session.identityId,
        groups,
        isStaff: groups.includes('professor') || groups.includes('admin'),
        isProfessor: groups.includes('professor'),
      });
    } catch {
      setState({ ready: true, signedIn: false, groups: [], isStaff: false, isProfessor: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return Hub.listen('auth', ({ payload }) => {
      if (['signedIn', 'signedOut', 'tokenRefresh'].includes(payload.event)) void refresh();
    });
  }, [refresh]);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    await refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
