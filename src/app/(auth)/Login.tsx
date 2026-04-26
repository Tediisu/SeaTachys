import { StyleSheet, View, TextInput, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BottomTabInset, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { authService } from '@/services/auth.services';
import Ionicons from '@expo/vector-icons/Ionicons';
import { goBack } from 'expo-router/build/global-state/routing';

export default function Login() {
  const colors = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ui = useMemo(() => {
    const isCompact = width < 390;
    const isTall = height > 850;

    return {
      pagePadding: isCompact ? 18 : 24,
      heroTitle: isCompact ? 34 : 42,
      cardRadius: isCompact ? 26 : 32,
      cardPadding: isCompact ? 20 : 24,
      inputHeight: isCompact ? 54 : 58,
      socialSize: isCompact ? 54 : 58,
      topGap: isTall ? 18 : 10,
    };
  }, [height, width]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await authService.login(email.trim(), password);
      console.log('✓ Login: token saved, navigating...');
      router.push('/');
    } catch (err: any) {
      console.log('✗ Login failed:', err.message);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topRow}>
              <Button
                variant="secondary"
                icon={<Ionicons name="chevron-back-outline" size={24} color="white" />}
                onPress={goBack}
                size="boxSmall"
                radius={50}
                style={{ paddingHorizontal: 0 }}
              />
            </View>

            <View style={styles.hero}>
              <ThemedText
                style={[
                  styles.heroTitle,
                  { fontSize: ui.heroTitle, lineHeight: ui.heroTitle + 4 },
                ]}
              >
                Welcome Back
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Login to continue ordering your seafood favorites.
              </ThemedText>
            </View>

            <View
              style={[
                styles.formCard,
                {
                  borderRadius: ui.cardRadius,
                  padding: ui.cardPadding,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>Login</ThemedText>
                <ThemedText style={styles.cardCaption}>
                  Enter your email and password to continue
                </ThemedText>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.metaRow}>
                <ThemedText style={styles.metaText}>Remember me</ThemedText>
                <Pressable>
                  <ThemedText style={styles.linkText}>Forgot Password?</ThemedText>
                </Pressable>
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <View style={styles.loginButtonWrap}>
                <Button
                  label={loading ? 'Logging in...' : 'Login'}
                  variant="secondary"
                  onPress={handleLogin}
                  size="large"
                  radius={20}
                  style={{ paddingHorizontal: 0, width: '100%' }}
                />
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <ThemedText style={styles.dividerText}>OR</ThemedText>
                <View style={styles.divider} />
              </View>

              <View style={styles.altLogin}>
                <Pressable style={[styles.socialButton, { width: ui.socialSize, height: ui.socialSize, borderRadius: ui.socialSize / 2 }]}>
                  <Image source={require('@/assets/images/google.png')} style={styles.logo} />
                </Pressable>
                <Pressable style={[styles.socialButton, { width: ui.socialSize, height: ui.socialSize, borderRadius: ui.socialSize / 2 }]}>
                  <Image source={require('@/assets/images/facebook.png')} style={styles.logo} />
                </Pressable>
                <Pressable style={[styles.socialButton, { width: ui.socialSize, height: ui.socialSize, borderRadius: ui.socialSize / 2 }]}>
                  <Image source={require('@/assets/images/apple.png')} style={styles.logo} />
                </Pressable>
              </View>

              <View style={styles.footer}>
                <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
                <Pressable onPress={() => router.push('/(auth)/SignUp')}>
                  <ThemedText style={styles.linkText}>Sign Up</ThemedText>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    marginBottom: 18,
  },
  hero: {
    marginBottom: 22,
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
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  cardCaption: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#FFFFFF',
    fontSize: FontSize.small,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputShell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: '500',
  },
  metaRow: {
    marginTop: 2,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.small,
  },
  linkText: {
    color: '#FFB347',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF7B7B',
    marginBottom: 14,
    fontSize: FontSize.small,
    fontWeight: '600',
  },
  loginButtonWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  altLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 22,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
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
});
