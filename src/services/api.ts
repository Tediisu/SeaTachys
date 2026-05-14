import Constants from 'expo-constants';
import { storage } from '@/utils/storage';

const EXPO_HOST_CANDIDATES = [
  Constants.expoConfig?.hostUri,
  Constants.expoGoConfig?.debuggerHost,
  Constants.linkingUri,
].filter(Boolean) as string[];

const getExpoHost = () => {
  for (const candidate of EXPO_HOST_CANDIDATES) {
    const match = candidate.match(/^(?:[^:]+:\/\/)?([^:/?]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

const resolveApiUrl = () => {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!rawUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  try {
    const url = new URL(rawUrl);
    const isLocalHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '0.0.0.0';

    if (isLocalHost) {
      const expoHost = getExpoHost();
      if (expoHost) {
        url.hostname = expoHost;
      }
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.replace(/\/$/, '');
  }
};

const API_URL = resolveApiUrl();
const REQUEST_TIMEOUT_MS = 15000;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const apiFetch = async (
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: object,
  includeAuth: boolean = true,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<any> => {
  const token = includeAuth ? await storage.getToken() : null;
  const controller = new AbortController();
  const abortTimeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('Request:', method, `${API_URL}${endpoint}`);
  console.log('Token:', token ? `${token.substring(0, 20)}...` : 'none');

  try {
    const res = await Promise.race([
      fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out for ${endpoint}`)), timeoutMs);
      }),
    ]);

    const text = await res.text();
    console.log('Response:', res.status, '| Body:', text || '(empty)');

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || 'Non-JSON response from server' };
    }

    if (res.status === 401) {
      if (includeAuth) {
        await storage.clearAuth();
      }
      throw new Error(data?.message || 'Unauthorized');
    }

    if (!res.ok) {
      throw new Error(data?.message || `${res.status} ${res.statusText}` || 'Something went wrong');
    }

    return data;
  } catch (error: any) {
    if (error?.name === 'AbortError' || typeof error?.message === 'string' && error.message.includes('timed out')) {
      throw new Error(`Request timed out for ${endpoint}`);
    }

    throw error;
  } finally {
    clearTimeout(abortTimeoutId);
  }
};
