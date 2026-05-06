import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const storage = {
    saveToken: async (token: string) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },
    saveRefreshToken: async (token: string) => {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    },
    getToken: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },
    getRefreshToken: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },
    removeToken: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    },
    removeRefreshToken: async () => {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },
    clearAuth: async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
    },
};
