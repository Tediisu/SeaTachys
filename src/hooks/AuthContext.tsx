import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/auth.services';

export type AuthUser = {
  userId: string;
  fullname: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: '',
  refetch: async () => {},
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUser = async () => {
    try {
      const data = await authService.getMe();
      console.log('✓ Auth: logged in as', data?.email, '|', data?.role);
      setUser(data);
      setError('');
    } catch (err: any) {
      console.log('✗ Auth: not logged in —', err.message);
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);

    try {
      await authService.login(email, password);
      await fetchUser();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setError('');
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refetch: fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
