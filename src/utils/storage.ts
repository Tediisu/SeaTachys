import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_tooken';

export const storage = {
    saveToken: async (token: string) => {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    },
    getToken: async (): Promise<string | null> => {
        return await AsyncStorage.getItem(TOKEN_KEY);
    },
    removeToken: async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
    }
}