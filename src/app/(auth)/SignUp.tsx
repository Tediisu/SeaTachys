import { StyleSheet, View, TextInput, Image, Dimensions } from 'react-native';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { apiFetch } from '@/services/api';

const { height } = Dimensions.get('window');

export default function SignUp() {
    const colors = useTheme();  
    const router = useRouter();

    const [ name, setName ] = useState('');
    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ confirmPassword, setConfirmPassword] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState('');

    const handleSignUp = async () => {
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await apiFetch('/api/auth/register', 'POST', {
                fullName: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                phoneNumber: null,
            }, false);
            router.push('/(auth)/Login');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };
    

    return(
        <ThemedView style={[styles.container, {backgroundColor: colors.primary}]}>
            <SafeAreaView style={styles.safeArea}>
                <View> {/*goBack */}

                </View>
                <View style={styles.header}>
                    <ThemedText>Sign Up</ThemedText>
                    <ThemedText>Please sign up to get started</ThemedText>
                </View>
                <View style={styles.userCred}>
                    <ThemedText>Name</ThemedText>
                    <View style={styles.userInfo}>
                        <TextInput
                            placeholder='Name'
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.textSecondary }]}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                    <ThemedText>Email</ThemedText>
                    <View style={styles.userInfo}>
                        <TextInput
                            placeholder='Email'
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.textSecondary }]}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                    </View >
                    <ThemedText>Password</ThemedText>
                    <View style={styles.userInfo}>
                        <TextInput
                            placeholder='Password'
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.textSecondary }]}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                        />
                    </View>
                    <ThemedText>Re-Type Password</ThemedText>
                    <View style={styles.userInfo}>
                        <TextInput
                            placeholder='Re-Type Password'
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.textSecondary }]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={true}
                        />
                    </View>
                    <View style={styles.signUpButton}>
                        <Button
                            label={loading ? 'Signing Up...' : 'Sign Up'}
                            variant='secondary'
                            onPress={handleSignUp}
                            size='large'
                            radius={20}
                            style={{ paddingHorizontal: 0 }}
                        />
                    </View>
                </View>
                {error ? (
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                ) : null}
                <View style={styles.orText}>
                    <ThemedText onPress={() => router.push('/(auth)/Login')}>
                        Already have an Account? <ThemedText style={{fontWeight: 'bold'}}>Log In</ThemedText>
                    </ThemedText>
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
  header: {
    height: height * 0.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCred: {
    padding: 30,
    gap: 10,
  },
  userInfo: {
    backgroundColor: 'white',
  },
  searchInput: {

  },
  signUpButton: {
    alignItems: 'center',
    padding: 20,
  },
  orText: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  errorText: {
    color: 'red',
    paddingHorizontal: 30,
    paddingBottom: 12,
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
})
