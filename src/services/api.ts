import { storage } from '@/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export const apiFetch = async (
    endpoint: string,
    method: HttpMethod= 'GET',
    body?: object
) => {
    const token = await storage.getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body): undefined,
    });

    if (res.status === 401) {
        await storage.removeToken();
        throw new Error('Unauthorized');
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || 'Something wen wrong');
    }

    return data;
};