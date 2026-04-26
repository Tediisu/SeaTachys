import { storage } from '@/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const apiFetch = async (
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: object,
  includeAuth: boolean = true
) => {
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
      await storage.removeToken();
    }
    throw new Error(data?.message || 'Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Something went wrong');
  }

  return data;
};
