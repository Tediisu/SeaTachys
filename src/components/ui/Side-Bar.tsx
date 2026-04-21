import { Animated, StyleSheet, TouchableOpacity, Text, Pressable, Dimensions,
  Modal, View,
  Touchable, 
 } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import Login from '@/app/(auth)/Login'
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '../themed-text';
import Button from '@/components/ui/Button';
  import Ionicons from '@expo/vector-icons/Ionicons';
  import Feather from '@expo/vector-icons/Feather';
  import AntDesign from '@expo/vector-icons/AntDesign';
  import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

function MenuItem({ icon, label, onPress }: { icon: React.ReactNode ; label: string; onPress?: () => void}) {
  return(
    <Pressable style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuIcon}>
          {icon}
        </View>
        <ThemedText style={{ flex: 1}} type="small" themeColor='background'>{label}</ThemedText>
        <Ionicons name="chevron-forward-outline" size={18} color="gray" />
    </Pressable>
  );
}


type Props = {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideBar({ isOpen, onClose }: Props) {
  const colors = useTheme();
  const router = useRouter();

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="none"
    >
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.sidebar}>
          <ThemedView style={styles.sidebarContent}>
            <View style={styles.profile}>
              <Button
                variant="primary"
                icon={<Ionicons name="chevron-back-outline" size={24} color="white"/>}
                onPress={onClose}
                size="boxSmall"
                radius={50}
                style={{ paddingHorizontal: 0 }}
              />
              <ThemedText type="medium" themeColor="textSecondary">Profile</ThemedText>
            </View>
            <View style={styles.profilePic}>
              <View style={[styles.pPic, { backgroundColor: colors.primary }]}>
                <Feather name="user" size={36} color="white" />
              </View>
              <View style={styles.userName}>
                <ThemedText type="medium" themeColor="textSecondary">Guest</ThemedText>
                <ThemedText type="medium" themeColor="textSecondary"></ThemedText> 
              </View>
            </View>
          <View style={styles.box}>
            <MenuItem icon={<Feather name="user" size={18} color="#e17324" />} label={"Personal Info"}/>
            <MenuItem icon={<Feather name="map" size={18} color="#5d24e1" />} label={"Address"}/>
          </View>
          <View style={styles.box2}>
            <MenuItem icon={<Feather name="shopping-bag" size={18} color="#2476e1" />} label="Cart" />
            <MenuItem icon={<Feather name="heart" size={18} color="#db24e1" />} label="Favorites" />
            <MenuItem icon={<Ionicons name="notifications-outline" size={18} color="#e1be24" />} label="Notifications" />
            <MenuItem icon={<Feather name="credit-card" size={18} color="#24cee1" />} label="Payment" />
          </View>
          <View style={styles.box3}>
            <MenuItem icon={<AntDesign name="question-circle" size={18} color="#dd6712" />} label="Help" />
            <MenuItem icon={<MaterialIcons name="reviews" size={18} color="#24e1a8" />} label="Reviews" />
            <MenuItem icon={<Ionicons name="settings" size={18} color="#5d24e1" />} label="Settings" />
          </View>
          <View style={styles.login}>
            {/* <MenuItem icon={<MaterialIcons name="logout" size={18} color="#e12424" />} label="Logout" /> */}
            <MenuItem 
              icon={<MaterialIcons name="login" size={24} color="#24e143" />} 
              label="Login" 
              onPress={() => router.push('/(auth)/Login')}
            />
          </View>
          </ThemedView>
        </SafeAreaView>
        <TouchableOpacity style={styles.overlay} onPress={onClose}/>
      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',       
  },
  sidebar: {
    width: width * 0.7,
  },
  sidebarContent: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    gap: 10,
  },
  overlay: {
    flex: 1,                    
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // Profile Bar
  backButton: {
    height: 50,
    width: 50,
    backgroundColor: 'colors.primary',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profile: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center', 
  },
  // Profile Pic Info
  profilePic:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  pPic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    flexDirection: 'column',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    padding: 4,
  },
  box2: {
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    padding: 4,
  },
  box3: {
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    padding: 4,
  },
  login: {
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    padding: 4,
  }
});