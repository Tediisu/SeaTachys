import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  addressService,
  formatSavedAddress,
  type SaveAddressInput,
  type SavedAddress,
} from '@/services/address.services';

const emptyAddressForm: SaveAddressInput = {
  label: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  zipCode: '',
  latitude: null,
  longitude: null,
  isDefault: false,
};

export default function UserProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<SaveAddressInput>(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      setAddresses(await addressService.list());
    } catch (error: any) {
      Alert.alert('Unable to load addresses', error?.message || 'Please try again.');
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const openCreateForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...emptyAddressForm,
      isDefault: addresses.length === 0,
    });
    setShowAddressForm(true);
  };

  const openEditForm = (address: SavedAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label ?? '',
      street: address.street,
      barangay: address.barangay ?? '',
      city: address.city,
      province: address.province ?? '',
      zipCode: address.zipCode ?? '',
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      isDefault: address.isDefault,
    });
    setShowAddressForm(true);
  };

  const saveAddress = async () => {
    if (!addressForm.street.trim() || !addressForm.city.trim()) {
      Alert.alert('Missing address', 'Street and city are required.');
      return;
    }

    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await addressService.update(editingAddressId, addressForm);
      } else {
        await addressService.create(addressForm);
      }

      setShowAddressForm(false);
      await loadAddresses();
    } catch (error: any) {
      Alert.alert('Unable to save address', error?.message || 'Please try again.');
    } finally {
      setSavingAddress(false);
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    setBusyAddressId(addressId);
    try {
      await addressService.setDefault(addressId);
      await loadAddresses();
    } catch (error: any) {
      Alert.alert('Unable to set default address', error?.message || 'Please try again.');
    } finally {
      setBusyAddressId(null);
    }
  };

  const deleteAddress = (address: SavedAddress) => {
    Alert.alert('Delete address?', formatSavedAddress(address), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyAddressId(address.id);
          try {
            await addressService.remove(address.id);
            await loadAddresses();
          } catch (error: any) {
            Alert.alert('Unable to delete address', error?.message || 'Please try again.');
          } finally {
            setBusyAddressId(null);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Feather name="user" size={38} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.avatarName}>{user?.fullName}</ThemedText>
              <View style={styles.rolePill}>
                <ThemedText style={styles.roleText}>{user?.role}</ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Profile Details</ThemedText>
              <View style={styles.detailRow}>
                <Feather name="user" size={16} color="#FF8E00" />
                <View>
                  <ThemedText style={styles.detailLabel}>Full Name</ThemedText>
                  <ThemedText style={styles.detailValue}>{user?.fullName || '—'}</ThemedText>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Feather name="mail" size={16} color="#2476E1" />
                <View>
                  <ThemedText style={styles.detailLabel}>Email</ThemedText>
                  <ThemedText style={styles.detailValue}>{user?.email || '—'}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <ThemedText style={styles.sectionTitle}>Saved Addresses</ThemedText>
                  <ThemedText style={styles.sectionCaption}>Choose the default used by home and checkout.</ThemedText>
                </View>
                <Pressable style={styles.addButton} onPress={openCreateForm}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              {loadingAddresses ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FF8E00" />
                  <ThemedText style={styles.mutedText}>Loading addresses...</ThemedText>
                </View>
              ) : addresses.length === 0 ? (
                <View style={styles.emptyAddressCard}>
                  <ThemedText style={styles.emptyAddressTitle}>No saved address yet</ThemedText>
                  <ThemedText style={styles.mutedText}>Add one before placing a delivery order.</ThemedText>
                </View>
              ) : (
                addresses.map((address) => (
                  <View key={address.id} style={styles.addressCard}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addressTitleRow}>
                        <ThemedText style={styles.addressLabel}>{address.label || 'Address'}</ThemedText>
                        {address.isDefault ? (
                          <View style={styles.defaultPill}>
                            <ThemedText style={styles.defaultPillText}>Default</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText style={styles.addressText}>{formatSavedAddress(address)}</ThemedText>
                    </View>
                    <View style={styles.addressActions}>
                      {!address.isDefault ? (
                        <Pressable
                          style={styles.smallAction}
                          onPress={() => setDefaultAddress(address.id)}
                          disabled={busyAddressId === address.id}
                        >
                          <ThemedText style={styles.smallActionText}>Set default</ThemedText>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.iconAction} onPress={() => openEditForm(address)}>
                        <Feather name="edit-2" size={14} color="#0F2F57" />
                      </Pressable>
                      <Pressable style={styles.iconAction} onPress={() => deleteAddress(address)}>
                        <Feather name="trash-2" size={14} color="#B42318" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {showAddressForm ? (
              <View style={styles.formCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    {editingAddressId ? 'Edit Address' : 'Add Address'}
                  </ThemedText>
                  <Pressable onPress={() => setShowAddressForm(false)}>
                    <Ionicons name="close" size={20} color="#111827" />
                  </Pressable>
                </View>
                <TextInput
                  value={addressForm.label ?? ''}
                  onChangeText={(label) => setAddressForm((current) => ({ ...current, label }))}
                  placeholder="Label, e.g. Home"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                <TextInput
                  value={addressForm.street}
                  onChangeText={(street) => setAddressForm((current) => ({ ...current, street }))}
                  placeholder="Street address"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                <TextInput
                  value={addressForm.barangay ?? ''}
                  onChangeText={(barangay) => setAddressForm((current) => ({ ...current, barangay }))}
                  placeholder="Barangay / Area"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                <TextInput
                  value={addressForm.city}
                  onChangeText={(city) => setAddressForm((current) => ({ ...current, city }))}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                <Pressable
                  style={styles.defaultToggleRow}
                  onPress={() => setAddressForm((current) => ({ ...current, isDefault: !current.isDefault }))}
                >
                  <Ionicons
                    name={addressForm.isDefault ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={addressForm.isDefault ? '#0F6E56' : '#94A3B8'}
                  />
                  <ThemedText style={styles.defaultToggleText}>Use as default address</ThemedText>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={saveAddress} disabled={savingAddress}>
                  {savingAddress ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Save address</ThemedText>
                  )}
                </Pressable>
              </View>
            ) : null}

            <Pressable style={styles.passwordButton} onPress={() => router.push('/(user)/ChangePassword')}>
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
  topBarTitle: { fontSize: FontSize.title, fontWeight: '800', color: '#111827' },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0F2F57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarName: { fontSize: FontSize.title, fontWeight: '900', color: '#111827' },
  rolePill: {
    backgroundColor: '#FFF4E7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleText: { color: '#FF8E00', fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#111827', fontSize: FontSize.title, fontWeight: '800' },
  sectionCaption: { color: '#6B7280', fontSize: FontSize.xs, marginTop: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { color: '#6B7280', fontSize: FontSize.xs },
  detailValue: { color: '#111827', fontSize: FontSize.body, fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F6E56',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  mutedText: { color: '#6B7280', fontSize: FontSize.small },
  emptyAddressCard: { borderRadius: 18, backgroundColor: '#F8FAFC', padding: 14, gap: 4 },
  emptyAddressTitle: { color: '#111827', fontSize: FontSize.body, fontWeight: '800' },
  addressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 10,
  },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressLabel: { color: '#111827', fontSize: FontSize.body, fontWeight: '900' },
  defaultPill: {
    backgroundColor: '#DDF4ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultPillText: { color: '#0F6E56', fontSize: 11, fontWeight: '900' },
  addressText: { color: '#6B7280', fontSize: FontSize.small, lineHeight: 20, marginTop: 4 },
  addressActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallAction: {
    borderRadius: 999,
    backgroundColor: '#EEF3F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionText: { color: '#0F2F57', fontSize: 12, fontWeight: '900' },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, gap: 12 },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#111827',
  },
  defaultToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  defaultToggleText: { color: '#111827', fontSize: FontSize.small, fontWeight: '700' },
  saveButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F6E56',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '900' },
  passwordButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordButtonText: { color: '#111827', fontSize: FontSize.body, fontWeight: '800' },
});
