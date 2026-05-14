import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
