import { apiFetch } from './api';
import { storage } from '@/utils/storage';

export type EmailLookupResponse = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

export const authService = {
  login: async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', 'POST', {
      email: email.trim().toLowerCase(),
      password,
    }, false, 30000) as LoginResponse;

    await storage.saveToken(data.token);
    return data;
  },

  lookupEmail: async (email: string) => {
    return await apiFetch('/api/auth/lookup-email', 'POST', {
      email: email.trim().toLowerCase(),
    }, false, 30000) as EmailLookupResponse;
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
    }, false, 120000);
  },

  getMe: async () => {
    return await apiFetch('/api/auth/me', 'GET', undefined, true, 120000);
  },

  logout: async () => {
    await storage.clearAuth();
  },
};
