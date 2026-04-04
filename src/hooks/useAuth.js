import { useCallback, useMemo, useState } from 'react';
import { getCurrentSession, login as loginRequest, logout as logoutSession } from '../services/authService';

export function useAuth() {
  const [session, setSession] = useState(() => getCurrentSession());

  const login = useCallback(async (credentials) => {
    const newSession = await loginRequest(credentials);
    setSession(newSession);
    return newSession;
  }, []);

  const logout = useCallback(() => {
    logoutSession();
    setSession(null);
  }, []);

  const auth = useMemo(
    () => ({
      isAuthenticated: Boolean(session?.token),
      user: session?.user ?? null,
      token: session?.token ?? null,
      session,
      login,
      logout,
    }),
    [login, logout, session],
  );

  return auth;
}
