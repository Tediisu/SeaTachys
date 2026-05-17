import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="Checkout" options={{ animationTypeForReplace: 'push' }} />
      <Stack.Screen name="Orders" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="UserProfile" />
      <Stack.Screen name="ChangePassword" />
      <Stack.Screen name="Assistant" />
    </Stack>
  );
}
