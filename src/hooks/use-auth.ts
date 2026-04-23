import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.services';

export type AuthUser = {
  userId: string;
  fullname: string;
  email: string;
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState((''));

  const fetchUser = async() => {
    try {
      const data = await authService.getMe();
      console.log('✓ Auth: logged in as', data?.email, '|', data?.role);
        setUser(data);
    } catch (err: any) {
      console.log('✗ Auth: not logged in —', err.message);
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       const data = await authService.getMe();
  //       console.log('✓ Auth: logged in as', data?.email, '|', data?.role);
  //       setUser(data);
  //     } catch (err: any) {
  //       console.log('✗ Auth: not logged in —', err.message);
  //       setUser(null);
  //       setError(err.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUser();
  // }, []);

  return { user, loading, error, refetch: fetchUser };
};