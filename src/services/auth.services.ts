import { apiFetch } from "./api";
import { storage } from "@/utils/storage";

export const authService = {
    login: async (email: string, password: string) => {
        const data = await apiFetch('/api/auth/login', 'POST', { email, password });
        await storage.saveToken(data.token);
        return data;
    },

    getMe: async () => {
        return await apiFetch('/api/auth/me');
    },

    logout: async () => {
        await storage.removeToken();
    }
};