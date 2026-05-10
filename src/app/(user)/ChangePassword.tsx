import { useState } from 'react';
import { apiFetch } from '@/services/api';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize } from '@/constants/theme';

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  iconColor,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  iconColor: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.fieldWrapper}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <Feather name="lock" size={16} color={iconColor} />
        </View>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <Pressable onPress={() => setShow((p) => !p)} style={styles.eyeButton}>
          <Feather name={show ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePassword() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
        await apiFetch('/api/auth/change-password', 'POST', {
      currentPassword,
      newPassword,
    });

      Alert.alert('Success', 'Password changed successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
    } catch {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
            <ThemedText style={styles.topBarTitle}>Change Password</ThemedText>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.banner}>
              <View style={styles.bannerIcon}>
                <Feather name="shield" size={32} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.bannerTitle}>Update your password</ThemedText>
              <ThemedText style={styles.bannerSubtitle}>
                Your new password must be at least 8 characters.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                iconColor="#5D24E1"
              />
              <View style={styles.divider} />
              <PasswordField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                iconColor="#0F2F57"
              />
              <View style={styles.divider} />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                iconColor="#0F6E56"
              />

              {confirmPassword.length > 0 && (
                <View style={styles.matchRow}>
                  <Feather
                    name={newPassword === confirmPassword ? 'check-circle' : 'x-circle'}
                    size={14}
                    color={newPassword === confirmPassword ? '#0F6E56' : '#D85A30'}
                  />
                  <ThemedText
                    style={[
                      styles.matchText,
                      { color: newPassword === confirmPassword ? '#0F6E56' : '#D85A30' },
                    ]}
                  >
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </ThemedText>
                </View>
              )}
            </View>

            <Pressable
              style={[styles.submitButton, saving && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Feather name="shield" size={16} color="#FFFFFF" />
              <ThemedText style={styles.submitText}>
                {saving ? 'Updating...' : 'Update Password'}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF3F8' },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#0F2F57',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  bannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: FontSize.small,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  fieldWrapper: { gap: 6 },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 10,
  },
  fieldIcon: {
    width: 28,
    alignItems: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: '#111827',
    paddingVertical: 10,
  },
  eyeButton: {
    padding: 4,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  matchText: {
    fontSize: FontSize.small,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#5D24E1',
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
});