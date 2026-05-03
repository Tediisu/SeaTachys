import { StyleSheet, View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BottomTabInset, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '@/services/auth.services';
import { useAuth } from '@/hooks/use-auth';

export default function SignUp() {
  const colors = useTheme();
  const router = useRouter();
  const { refetch } = useAuth();
  const { width, height } = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ui = useMemo(() => {
    const isCompact = width < 390;
    const isTall = height > 850;

    return {
      pagePadding: isCompact ? 18 : 24,
      heroTitle: isCompact ? 32 : 40,
      cardRadius: isCompact ? 28 : 34,
      cardPadding: isCompact ? 20 : 24,
      inputHeight: isCompact ? 54 : 58,
      topGap: isTall ? 18 : 10,
    };
  }, [height, width]);

  const handleSignUp = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError('Please complete the required fields.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.register({
        fullName: normalizedName,
        email: normalizedEmail,
        password,
        phoneNumber: normalizedPhone || null,
      });

      await authService.login(normalizedEmail, password);
      await refetch();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.accentShade }]}>
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
              <View style={styles.heroBadge}>
                <ThemedText style={styles.heroBadgeText}>New here?</ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.heroTitle,
                  { fontSize: ui.heroTitle, lineHeight: ui.heroTitle + 4 },
                ]}
              >
                Create your seafood account
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Join SeaTachys to save your details and start ordering in a few taps.
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
                <ThemedText style={styles.cardTitle}>Register</ThemedText>
                <ThemedText style={styles.cardCaption}>
                  Fill in your details and we&apos;ll sign you in right away.
                </ThemedText>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Full Name</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="person-outline" size={18} color={colors.accentShade} />
                  <TextInput
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.accentShade} />
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
                <ThemedText style={styles.label}>Phone Number</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="call-outline" size={18} color={colors.accentShade} />
                  <TextInput
                    placeholder="Optional"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.accentShade} />
                  <TextInput
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Confirm Password</ThemedText>
                <View style={[styles.inputShell, { minHeight: ui.inputHeight }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentShade} />
                  <TextInput
                    placeholder="Repeat password"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <View style={styles.registerButtonWrap}>
                <Button
                  label={loading ? 'Creating account...' : 'Create Account'}
                  variant="primary"
                  onPress={handleSignUp}
                  size="large"
                  radius={20}
                  style={{ paddingHorizontal: 0, width: '100%' }}
                />
              </View>

              <View style={styles.footer}>
                <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
                <Pressable onPress={() => router.push('/(auth)/Login')}>
                  <ThemedText style={styles.linkText}>Login here</ThemedText>
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
    top: -100,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -50,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,35,71,0.16)',
  },
  topRow: {
    marginBottom: 18,
  },
  hero: {
    marginBottom: 22,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#FFF2D9',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -1,
    maxWidth: 310,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.84)',
    fontSize: FontSize.subtitle,
    lineHeight: 24,
    maxWidth: 328,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
    color: 'rgba(255,255,255,0.76)',
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
  errorText: {
    color: '#FFE2E2',
    fontSize: FontSize.small,
    lineHeight: 20,
    marginTop: 2,
  },
  registerButtonWrap: {
    marginTop: 14,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: FontSize.small,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: FontSize.small,
    fontWeight: '800',
  },
});
