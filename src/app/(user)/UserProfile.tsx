import { useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';

function EditableRow({
  label,
  value,
  isEditing,
  onChangeText,
  onEdit,
  onSave,
  saving,
  iconName,
  iconColor,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  onEdit: () => void;
  onSave: () => void;
  saving: boolean;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
}) {
  return (
    <View style={styles.editableRow}>
      <View style={styles.editableRowIcon}>
        <Feather name={iconName} size={16} color={iconColor} />
      </View>
      <View style={styles.editableRowContent}>
        <ThemedText style={styles.editableRowLabel}>{label}</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.editableInput}
            value={value}
            onChangeText={onChangeText}
            autoFocus
            autoCapitalize="words"
          />
        ) : (
          <ThemedText style={styles.editableRowValue}>{value || '—'}</ThemedText>
        )}
      </View>
      {isEditing ? (
        <Pressable
          style={[styles.saveIconButton, saving && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={saving}
        >
          <Feather name="check" size={16} color="#FFFFFF" />
        </Pressable>
      ) : (
        <Pressable style={styles.editIconButton} onPress={onEdit}>
          <Feather name="edit-2" size={14} color="#6B7280" />
        </Pressable>
      )}
    </View>
  );
}

export default function UserProfile() {
  const router = useRouter();
  const { user } = useAuth();

  console.log('user:', JSON.stringify(user));

  const [fullname, setFullname] = useState(user?.fullName ?? '');
  const [address, setAddress] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (field: 'name' | 'address') => {
    if (field === 'name' && !fullname.trim()) {
      Alert.alert('Validation', 'Full name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      // TODO: call your API to update the field
      if (field === 'name') setEditingName(false);
      else setEditingAddress(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    router.push('/ChangePassword'); // adjust path as needed
  };

  return (
    
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
            <ThemedText style={styles.topBarTitle}>Personal Info</ThemedText>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Feather name="user" size={38} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.avatarName}>{user?.fullName}</ThemedText>
              <View style={styles.rolePill}>
                <ThemedText style={styles.roleText}>{user?.role}</ThemedText>
              </View>
            </View>

            {/* Profile Details */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Profile Details</ThemedText>

              <EditableRow
                label="Full Name"
                value={fullname}
                isEditing={editingName}
                onChangeText={setFullname}
                onEdit={() => {
                  setEditingAddress(false);
                  setEditingName(true);
                }}
                onSave={() => handleSave('name')}
                saving={saving}
                iconName="user"
                iconColor="#FF8E00"
              />

              <View style={styles.divider} />

              <View style={styles.editableRow}>
                <View style={styles.editableRowIcon}>
                  <Feather name="mail" size={16} color="#2476E1" />
                </View>
                <View style={styles.editableRowContent}>
                  <ThemedText style={styles.editableRowLabel}>Email</ThemedText>
                  <ThemedText style={styles.editableRowValue}>{user?.email}</ThemedText>
                </View>
              </View>

              <View style={styles.divider} />

              <EditableRow
                label="Address"
                value={address}
                isEditing={editingAddress}
                onChangeText={setAddress}
                onEdit={() => {
                  setEditingName(false);
                  setEditingAddress(true);
                }}
                onSave={() => handleSave('address')}
                saving={saving}
                iconName="map-pin"
                iconColor="#0F6E56"
              />
            </View>

            {/* Change Password */}
            <Pressable style={styles.passwordButton} onPress={handleChangePassword}>
              <View style={styles.passwordButtonLeft}>
                <View style={styles.passwordIcon}>
                  <Feather name="lock" size={16} color="#5D24E1" />
                </View>
                <ThemedText style={styles.passwordButtonText}>Change Password</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  safeArea: {
    flex: 1,
  },
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
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0F2F57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarName: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: '#111827',
  },
  rolePill: {
    backgroundColor: 'rgba(15,47,87,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    color: '#0F2F57',
    fontSize: FontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 4,
  },
  sectionTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  editableRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editableRowContent: {
    flex: 1,
    gap: 2,
  },
  editableRowLabel: {
    fontSize: FontSize.xs,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editableRowValue: {
    fontSize: FontSize.body,
    color: '#111827',
    fontWeight: '600',
  },
  editableInput: {
    fontSize: FontSize.body,
    color: '#111827',
    fontWeight: '600',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F2F57',
    paddingVertical: 2,
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  passwordButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passwordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#111827',
  },
});