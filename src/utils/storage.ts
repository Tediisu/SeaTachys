import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const storage = {
    saveToken: async (token: string) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },
    getToken: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },
    removeToken: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
};