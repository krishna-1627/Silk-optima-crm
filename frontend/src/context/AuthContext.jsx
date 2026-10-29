import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { fetchCurrentUser } from '../services/auth';

const AuthContext = createContext(null);
const STORAGE_KEYS = {
  token: 'silk-optima-token',
  user: 'silk-optima-user',
  expiresAt: 'silk-optima-expires-at',
  rememberMe: 'silk-optima-remember-me',
};
const SESSION_TTL_MS = 60 * 60 * 1000;
const REMEMBER_TTL_MS = 8 * 60 * 60 * 1000;

function getStoredSession() {
  const localToken = window.localStorage.getItem(STORAGE_KEYS.token);
  const sessionToken = window.sessionStorage.getItem(STORAGE_KEYS.token);
  const token = localToken || sessionToken;
  const storedUser = window.localStorage.getItem(STORAGE_KEYS.user) || window.sessionStorage.getItem(STORAGE_KEYS.user);
  const expiresAt = Number(window.localStorage.getItem(STORAGE_KEYS.expiresAt) || window.sessionStorage.getItem(STORAGE_KEYS.expiresAt) || 0);
  const rememberMe = window.localStorage.getItem(STORAGE_KEYS.rememberMe) === 'true';

  return {
    token,
    user: storedUser ? JSON.parse(storedUser) : null,
    expiresAt,
    rememberMe,
  };
}

function clearStoredSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getStoredSession().user;
  });
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getStoredSession().token;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (!token) {
      clearStoredSession();
      delete api.defaults.headers.common.Authorization;
      setLoading(false);
      return undefined;
    }

    const session = getStoredSession();
    const expiresAt = session.expiresAt || 0;
    if (expiresAt && Date.now() > expiresAt) {
      clearStoredSession();
      setUser(null);
      setToken(null);
      delete api.defaults.headers.common.Authorization;
      setLoading(false);
      return undefined;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    fetchCurrentUser()
      .then((profile) => setUser(profile))
      .catch(() => {
        clearStoredSession();
        setUser(null);
        setToken(null);
        delete api.defaults.headers.common.Authorization;
      })
      .finally(() => setLoading(false));

    return undefined;
  }, [token]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEYS.user);
        window.sessionStorage.removeItem(STORAGE_KEYS.user);
      }
      return;
    }

    const session = getStoredSession();
    const storage = session.rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }, [user]);

    const login = ({ accessToken, user: profile, rememberMe = false }) => {
    if (typeof window === 'undefined') {
      setToken(accessToken);
      setUser(profile);
      return;
    }

    const ttl = rememberMe ? REMEMBER_TTL_MS : SESSION_TTL_MS;
    const expiresAt = Date.now() + ttl;
    const storage = rememberMe ? window.localStorage : window.sessionStorage;

    clearStoredSession();
    storage.setItem(STORAGE_KEYS.token, accessToken);
    storage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
    storage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
    if (rememberMe) {
      window.localStorage.setItem(STORAGE_KEYS.rememberMe, 'true');
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.rememberMe);
    }

    setToken(accessToken);
    setUser(profile);
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common.Authorization;
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      updateUser,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin' || user?.role === 'hr',
      isCandidate: user?.role === 'candidate',
      isEmployee: user?.role === 'employee' || user?.role === 'staff' || user?.role === 'hr',
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
