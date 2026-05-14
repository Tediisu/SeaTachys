import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '@/services/auth.services';
import { storage } from '@/utils/storage';

export type AuthUser = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: '',
  refetch: async () => {},
  login: async () => ({ userId: '', fullName: '', email: '', role: '' }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authRequestId = useRef(0);

  const fetchUser = async () => {
    const requestId = ++authRequestId.current;

    try {
      const data = await authService.getMe();
      if (requestId !== authRequestId.current) {
        return;
      }

      console.log('✓ Auth: logged in as', data?.email, '|', data?.role);
      setUser(data);
      await storage.saveUser(data);
      setError('');
    } catch (err: any) {
      if (requestId !== authRequestId.current) {
        return;
      }

      console.log('✗ Auth refresh failed —', err.message);

      if (err?.message === 'Unauthorized') {
        setUser(null);
        setError(err.message);
        await storage.clearAuth();
      } else {
        const cachedUser = await storage.getUser();
        if (cachedUser) {
          setUser(cachedUser);
          setError('');
        } else {
          setUser(null);
          setError(err.message);
        }
      }
    } finally {
      if (requestId === authRequestId.current) {
        setLoading(false);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const requestId = ++authRequestId.current;

    try {
      const data = await authService.login(email, password);
      const authUser = {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
      };

      if (requestId !== authRequestId.current) {
        return authUser;
      }

      setUser(authUser);
      await storage.saveUser(authUser);
      setError('');
      return authUser;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    authRequestId.current += 1;
    await authService.logout();
    setUser(null);
    setError('');
    setLoading(false);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const cachedUser = await storage.getUser();
      const token = await storage.getToken();

      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
      }

      if (!token) {
        setUser(cachedUser ?? null);
        setLoading(false);
        setError('');
        return;
      }

      await fetchUser();
    };

    bootstrapAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refetch: fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
