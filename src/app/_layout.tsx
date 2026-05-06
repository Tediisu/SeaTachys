import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Slot } from 'expo-router';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';
import { CartProvider } from '@/hooks/use-cart';
import { AuthProvider } from '@/hooks/AuthContext';
import { AppBootstrapProvider } from '@/hooks/AppBootstrapContext';
import { AppBootSkeleton } from '@/components/ui/SkeletonScreens';

function AppShell() {
  const { loading } = useAuth();

  if (loading) {
    return <AppBootSkeleton />;
  }

  return (
    <AppBootstrapProvider>
      <CartProvider>
        <AnimatedSplashOverlay />
        <Slot />
      </CartProvider>
    </AppBootstrapProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
