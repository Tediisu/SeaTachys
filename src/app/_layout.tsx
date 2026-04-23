import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading } = useAuth(); 

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}
