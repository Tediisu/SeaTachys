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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (email: string, password: string) => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const data = await apiFetch('/api/auth/login', 'POST', {
          email: email.trim().toLowerCase(),
          password,
        }, false, 15000) as LoginResponse;

        await storage.saveToken(data.token);
        return data;
      } catch (error: any) {
        lastError = error;
        const isTimeout = typeof error?.message === 'string' && error.message.includes('timed out');

        if (!isTimeout || attempt === 2) {
          throw error;
        }

        await delay(800 * (attempt + 1));
      }
    }

    throw lastError ?? new Error('Unable to log in.');
  },

  lookupEmail: async (email: string) => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await apiFetch('/api/auth/lookup-email', 'POST', {
          email: email.trim().toLowerCase(),
        }, false, 12000) as EmailLookupResponse;
      } catch (error: any) {
        lastError = error;
        const isTimeout = typeof error?.message === 'string' && error.message.includes('timed out');

        if (!isTimeout || attempt === 2) {
          throw error;
        }

        await delay(600 * (attempt + 1));
      }
    }

    throw lastError ?? new Error('Unable to look up account.');
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
