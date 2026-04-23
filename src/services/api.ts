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

        console.log('📡 Request:', method, `${API_URL}${endpoint}`);
        console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'none');

        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body): undefined,
        });

        const text = await res.text();
        console.log('📨 Response:', res.status, '| Body:', text || '(empty)');

        if (res.status === 401) {
            await storage.removeToken();
            throw new Error('Unauthorized');
        }

        // const data = await res.json();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
};