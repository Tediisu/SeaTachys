import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'expo-router';
import { AppBootSkeleton } from '@/components/ui/SkeletonScreens';

export default function Index() {
  const { user, loading } = useAuth();
  const riderHomeHref = '/(rider)/Home' as any;

  if (loading) {
    return <AppBootSkeleton />;
  }

  if (!user) return <Redirect href="/(auth)/Continue" />;

  switch (user.role) {
    case 'admin':  return <Redirect href="/(admin)/Dashboard" />;
    case 'rider':  return <Redirect href={riderHomeHref} />;
    case 'customer':   return <Redirect href="/(user)/(tabs)/Home" />;
    default:       return <Redirect href="/(guest)/Home" />;
  }
}
