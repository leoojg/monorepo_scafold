import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { customInstance } from '@/api/client';

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  operator: Operator | null;
  token: string | null;
  login: (token: string, operator: Operator) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );
  const [operator, setOperator] = useState<Operator | null>(() => {
    const stored = localStorage.getItem('auth_operator');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((newToken: string, newOperator: Operator) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_operator', JSON.stringify(newOperator));
    setToken(newToken);
    setOperator(newOperator);
  }, []);

  const logout = useCallback(async () => {
    try {
      await customInstance({ url: '/auth/logout', method: 'POST' });
    } catch {
      // ignore errors — clear local state regardless
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_operator');
    setToken(null);
    setOperator(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        operator,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
