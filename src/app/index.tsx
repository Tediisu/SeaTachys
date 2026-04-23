import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

    if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return <Redirect href="/(guest)/Home" />;

  switch (user.role) {
    case 'admin':  return <Redirect href="/(admin)/Home" />; //Delete Hom.tsx later maybe
    // case 'Rider':  return <Redirect href="/(rider)/Home" />;
    case 'customer':   return <Redirect href="/(user)/Home" />;
    default:       return <Redirect href="/(guest)/Home" />;
  }
}
