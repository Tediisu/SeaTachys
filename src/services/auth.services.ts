import { apiFetch } from './api';
import { storage } from '@/utils/storage';

export const authService = {
  login: async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', 'POST', { email: email.trim().toLowerCase(), password }, false);
    await storage.saveToken(data.token);
    return data;
  },

  register: async (input: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string | null;
  }) => {
    return await apiFetch('/api/auth/register', 'POST', {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      phoneNumber: input.phoneNumber ?? null,
    }, false);
  },

  getMe: async () => {
    return await apiFetch('/api/auth/me');
  },

  logout: async () => {
    await storage.removeToken();
  },
};
