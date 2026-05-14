import { StyleSheet, View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BottomTabInset, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/use-auth';

const INPUT_TEXT_COLOR = '#111827';

const getHomeRoute = (role: string) => {
  switch (role) {
    case 'admin':
      return '/(admin)/Dashboard';
    case 'customer':
      return '/(user)/Home';
    default:
      return '/(guest)/Home';
  }
};

export default function Password() {
  const colors = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    email?: string;
    fullName?: string;
    role?: string;
  }>();

  const email = typeof params.email === 'string' ? params.email : '';
  const fullName = typeof params.fullName === 'string' ? params.fullName : '';

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
      topGap: isTall ? 18 : 10,
    };
  }, [height, width]);

  if (!email) {
    return <Redirect href="/(auth)/Login" />;
  }

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authUser = await login(email, password);
      console.log('✓ Login: session ready, navigating...');
      router.replace(getHomeRoute(authUser.role));
    } catch (err: any) {
      console.log('✗ Login failed:', err.message);
      const message =
        err?.message === 'Unauthorized' || err?.message === 'Invalid credentials.'
          ? 'Invalid email or password.'
          : err?.message || 'Login failed';
      setError(message);
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
                onPress={() => router.back()}
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
                {fullName ? `Hi, ${fullName.split(' ')[0]}` : 'Welcome Back'}
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Your account is ready. Enter your password to finish signing in.
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
                <ThemedText style={styles.cardTitle}>Enter Password</ThemedText>
                <ThemedText style={styles.cardCaption}>
                  Signing in as {email}
                </ThemedText>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    keyboardAppearance="light"
                    selectionColor={colors.primary}
                    cursorColor={colors.primary}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              <View style={styles.metaRow}>
                <Pressable onPress={() => router.replace({ pathname: '/(auth)/Login' })}>
                  <ThemedText style={styles.linkText}>Use a different email</ThemedText>
                </Pressable>
                <Pressable>
                  <ThemedText style={styles.linkText}>Forgot Password?</ThemedText>
                </Pressable>
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <View style={styles.primaryAction}>
                <Button
                  label={loading ? 'Logging in...' : 'Login'}
                  variant="secondary"
                  onPress={handleLogin}
                  size="large"
                  radius={20}
                  style={{ paddingHorizontal: 0, width: '100%' }}
                />
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
    marginBottom: 24,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSize.subtitle,
    lineHeight: 25,
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
    lineHeight: 34,
  },
  cardCaption: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.76)',
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputShell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: INPUT_TEXT_COLOR,
    paddingVertical: 16,
  },
  metaRow: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#FFE1E1',
    marginBottom: 10,
    fontSize: FontSize.small,
  },
  primaryAction: {
    marginTop: 4,
  },
  linkText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
