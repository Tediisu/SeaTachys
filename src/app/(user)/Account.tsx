import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth.services';

function AccountRow({
  icon,
  label,
  caption,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  caption?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.accountRow} onPress={onPress}>
      <View style={styles.accountRowIcon}>{icon}</View>
      <View style={styles.accountRowText}>
        <ThemedText style={styles.accountRowLabel}>{label}</ThemedText>
        {caption ? <ThemedText style={styles.accountRowCaption}>{caption}</ThemedText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Feather name="user" size={34} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.name}>{user?.fullname ?? 'Guest User'}</ThemedText>
              <ThemedText style={styles.email}>{user?.email ?? 'Sign in to personalize your account'}</ThemedText>
              <View style={styles.rolePill}>
                <ThemedText style={styles.roleText}>{user?.role ?? 'guest'}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <AccountRow
              icon={<Feather name="user" size={18} color="#FF8E00" />}
              label="Personal info"
              caption="Profile details and contact information"
              onPress={() => Alert.alert('Coming soon', 'Profile editing can be added next.')}
            />
            <AccountRow
              icon={<Feather name="map-pin" size={18} color="#0F6E56" />}
              label="Saved addresses"
              caption="Manage your delivery locations"
              onPress={() => Alert.alert('Coming soon', 'Address management can be added next.')}
            />
            <AccountRow
              icon={<Ionicons name="notifications-outline" size={18} color="#5D24E1" />}
              label="Notifications"
              caption="Control order and promo alerts"
              onPress={() => Alert.alert('Coming soon', 'Notification preferences can be added next.')}
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
            <AccountRow
              icon={<Ionicons name="color-palette-outline" size={18} color="#D85A30" />}
              label="Customization"
              caption="Theme, layout, and app preferences"
              onPress={() => Alert.alert('Coming soon', 'Customization settings can be added here.')}
            />
            <AccountRow
              icon={<Feather name="help-circle" size={18} color="#2476E1" />}
              label="Help center"
              caption="FAQs and support"
              onPress={() => Alert.alert('Coming soon', 'Help and support can be added next.')}
            />
            {user?.role === 'admin' ? (
              <AccountRow
                icon={<MaterialCommunityIcons name="view-dashboard-outline" size={20} color="#111827" />}
                label="Admin dashboard"
                caption="Manage menu, promos, and store content"
                onPress={() => router.push('/(admin)/Dashboard')}
              />
            ) : null}
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </Pressable>
        </ScrollView>
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
  content: {
    padding: 18,
    gap: 18,
    paddingBottom: 34,
  },
  header: {
    backgroundColor: '#0F2F57',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FF8E00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  email: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSize.small,
    lineHeight: 20,
    marginTop: 4,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleText: {
    color: '#FFDCA8',
    fontSize: FontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: FontSize.title,
    fontWeight: '800',
    marginBottom: 6,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  accountRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRowText: {
    flex: 1,
  },
  accountRowLabel: {
    color: '#111827',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  accountRowCaption: {
    color: '#6B7280',
    fontSize: FontSize.small,
    lineHeight: 18,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#D85A30',
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: '800',
  },
});
