import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'auth_user';

type StoredAuthUser = {
    userId: string;
    fullName: string;
    email: string;
    role: string;
};

export const storage = {
    saveToken: async (token: string) => {
        await Promise.all([
            SecureStore.setItemAsync(TOKEN_KEY, token),
            AsyncStorage.setItem(TOKEN_KEY, token),
        ]);
    },
    saveUser: async (user: StoredAuthUser) => {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },
    getToken: async (): Promise<string | null> => {
        const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (secureToken) {
            return secureToken;
        }

        return await AsyncStorage.getItem(TOKEN_KEY);
    },
    getUser: async (): Promise<StoredAuthUser | null> => {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as StoredAuthUser;
        } catch {
            return null;
        }
    },
    removeToken: async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            AsyncStorage.removeItem(TOKEN_KEY),
        ]);
    },
    clearAuth: async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
            AsyncStorage.removeItem(TOKEN_KEY),
            AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
            AsyncStorage.removeItem(AUTH_USER_KEY),
        ]);
    },
};
