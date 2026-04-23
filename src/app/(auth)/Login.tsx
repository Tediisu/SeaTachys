import { StyleSheet, View, Pressable, Text, TextInput,
     ScrollView, FlatList, Image, Dimensions 
} from 'react-native';
import { BottomTabInset, MaxContentWidth, Spacing, FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authService } from '@/services/auth.services';

import Ionicons from '@expo/vector-icons/Ionicons';
import { goBack } from 'expo-router/build/global-state/routing';

const { width, height } = Dimensions.get('window');
// const API_URL = 'http://10.72.8.55:5076';
const API_URL = process.env.EXPO_PUBLIC_API_URL;


export default function Login() {
    const colors = useTheme();
    const router = useRouter();

    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState('');

    const handleLogin = async () => {
      setLoading(true);
      setError('');
      try {
        await authService.login(email, password);
        router.push('/HomeAuth');
      } catch (err: any) {
        setError(err.message || 'Login failed');
      } finally {
        setLoading(false);
      }
    };
    
    return (
    <ThemedView style={[styles.container, {backgroundColor: colors.primary}]} >
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.goBack}>
                <Button
                    variant="secondary"
                    icon={<Ionicons name="chevron-back-outline" size={24} color="white"/>}
                    onPress={goBack}
                    size="boxSmall"
                    radius={50}
                    style={{ paddingHorizontal: 0 }}
                />
            </View>
            <View style={styles.header}>
                <ThemedText>Login</ThemedText>
            </View>
            <View style={styles.userCreds}>
                <ThemedText>Email</ThemedText>
                <View style={styles.userInfo}>
                    <TextInput
                        placeholder='Email'
                        placeholderTextColor={colors.primaryShade}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>
                <ThemedText>Password</ThemedText>
                <View style={styles.userInfo}>
                    <TextInput
                    placeholder='Password'
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.searchInput, { color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={false}
                    />
                </View>
                <View style={styles.rememberMe}>
                    <ThemedText>Remember me</ThemedText>
                    <ThemedText>Forgot Password?</ThemedText>
                </View>
            </View>
            {error ? (
                <ThemedText style={{ color: 'red', paddingHorizontal: 30 }}>
                    {error}
                </ThemedText>
            ) : null}
            <View style={styles.loginButton}>
                <Button
                    label="Login"
                    variant="secondary"
                    onPress={handleLogin}
                    size="large"
                    radius={20}
                    style={{ paddingHorizontal: 0 }}
                />
            </View>

            <View style={styles.orText}>
                <ThemedText onPress={() => router.push('/(auth)/SignUp')}>
                Don't have an Account? <ThemedText>Sign Up</ThemedText>
                </ThemedText>
                <ThemedText>OR</ThemedText>
            </View>
            <View style={styles.altLogin}>
                <Image source={require("@/assets/images/google.png")} style={styles.logo}/>
                <Image source={require("@/assets/images/facebook.png")} style={styles.logo}/>
                <Image source={require("@/assets/images/apple.png")} style={styles.logo}/>
                {/* <Image source={require{"@/assets/images/apple.png"}} style={styles.apple}/> */}
            </View>
        </SafeAreaView>
    </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    alignItems: 'stretch',
    paddingBottom: BottomTabInset + Spacing.three,
  },
  goBack: {
    padding: 20,
  },
  header: {
    height: height * 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCreds: {
    padding: 30,
    gap: 10,
  },
  userInfo: {
    backgroundColor: 'white',
  },
  rememberMe: {
    flex: 1,
    flexDirection: 'row',
  },
  loginButton: {
    // justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  orText: {
    alignItems: 'center',
  },
  altLogin: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  logo: {
    backgroundColor: 'white',
    borderRadius: 50,
    width: 50,
    height: 50,
  },
  searchInput: {

  }
})