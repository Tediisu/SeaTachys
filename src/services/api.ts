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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || !data?.token || !data?.refreshToken) {
    await storage.clearAuth();
    return null;
  }

  await storage.saveToken(data.token);
  await storage.saveRefreshToken(data.refreshToken);
  return data.token;
};

const getRefreshedToken = async () => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export const apiFetch = async (
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: object,
  includeAuth: boolean = true,
  hasRetried: boolean = false
): Promise<any> => {
  const token = includeAuth ? await storage.getToken() : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('Request:', method, `${API_URL}${endpoint}`);
  console.log('Token:', token ? `${token.substring(0, 20)}...` : 'none');

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
      if (!hasRetried) {
        const nextToken = await getRefreshedToken();
        if (nextToken) {
          return apiFetch(endpoint, method, body, includeAuth, true);
        }
      }

      await storage.clearAuth();
    }
    throw new Error(data?.message || 'Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Something went wrong');
  }

  return data;
};
