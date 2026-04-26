import { StyleSheet, View, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BottomTabInset, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Continue() {
  const colors = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const ui = useMemo(() => {
    const isCompact = width < 390;
    const isTall = height > 850;

    return {
      pagePadding: isCompact ? 18 : 24,
      heroTitle: isCompact ? 34 : 44,
      cardPadding: isCompact ? 20 : 24,
      cardRadius: isCompact ? 26 : 32,
      optionHeight: isCompact ? 58 : 62,
      logoSize: isCompact ? 86 : 100,
      topGap: isTall ? 20 : 10,
    };
  }, [height, width]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: ui.pagePadding,
                paddingBottom: BottomTabInset + Spacing.four,
                paddingTop: ui.topGap,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandWrap}>
              <View style={[styles.logoBadge, { width: ui.logoSize, height: ui.logoSize, borderRadius: ui.logoSize / 3 }]}>
                <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
              </View>
              <ThemedText
                style={[
                  styles.heroTitle,
                  { fontSize: ui.heroTitle, lineHeight: ui.heroTitle + 4 },
                ]}
              >
                SeaTachys
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Fresh seafood, fast delivery, and an easier way to continue.
              </ThemedText>
            </View>

            <View
              style={[
                styles.card,
                {
                  padding: ui.cardPadding,
                  borderRadius: ui.cardRadius,
                },
              ]}
            >
              <ThemedText style={styles.cardTitle}>Choose an account</ThemedText>
              <ThemedText style={styles.cardCaption}>
                Pick how you want to sign in before you start ordering.
              </ThemedText>

              <Pressable style={[styles.optionButton, { minHeight: ui.optionHeight }]} onPress={() => console.log('Google login coming soon')}>
                <View style={styles.optionIconShell}>
                  <Image source={require('@/assets/images/google.png')} style={styles.optionLogo} />
                </View>
                <ThemedText style={styles.optionText}>Continue with Google</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

              <Pressable style={[styles.optionButton, { minHeight: ui.optionHeight }]} onPress={() => console.log('Facebook login coming soon')}>
                <View style={styles.optionIconShell}>
                  <Image source={require('@/assets/images/facebook.png')} style={styles.optionLogo} />
                </View>
                <ThemedText style={styles.optionText}>Continue with Facebook</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

              <Pressable style={[styles.optionButton, { minHeight: ui.optionHeight }]} onPress={() => router.push('/(auth)/Login')}>
                <View style={styles.emailIconShell}>
                  <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.optionText}>Continue with Email</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.primaryAction}>
                <Button
                  label="Create an Account"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/SignUp')}
                  size="large"
                  radius={20}
                  style={{ paddingHorizontal: 0, width: '100%' }}
                />
              </View>

              <View style={styles.footer}>
                <ThemedText style={styles.footerText}>Already registered? </ThemedText>
                <Pressable onPress={() => router.push('/(auth)/Login')}>
                  <ThemedText style={styles.linkText}>Login with Email</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topGlow: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -40,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,142,0,0.10)',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: 18,
  },
  logo: {
    width: '72%',
    height: '72%',
    resizeMode: 'contain',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSize.subtitle,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  cardCaption: {
    marginTop: 6,
    marginBottom: 18,
    color: 'rgba(255,255,255,0.72)',
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  optionIconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F8FB',
  },
  emailIconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8E00',
  },
  optionLogo: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  optionText: {
    flex: 1,
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  primaryAction: {
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.body,
  },
  linkText: {
    color: '#FFB347',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
