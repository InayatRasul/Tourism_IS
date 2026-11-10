import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types/models';
import { getStoredToken, setStoredToken, ApiError } from '../api/client';
import { loginApi, LoginPayload, meApi, registerApi, RegisterPayload } from '../api/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  updateProfileLocal: (patch: Partial<Pick<User, 'full_name' | 'phone'>>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function roleDefaultPath(role: UserRole): string {
  switch (role) {
    case 'guide':
    case 'agency_manager':
      return '/provider';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    meApi()
      .then((u) => setUser(u))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setStoredToken(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const res = await loginApi(payload);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await registerApi(payload);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const updateProfileLocal = (patch: Partial<Pick<User, 'full_name' | 'phone'>>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfileLocal }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
