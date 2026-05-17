import { apiFetch } from './api';

const ADDRESS_TIMEOUT_MS = 30000;

export type SavedAddress = {
  id: string;
  label?: string | null;
  street: string;
  barangay?: string | null;
  city: string;
  province?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt: string;
};

export type SaveAddressInput = {
  label?: string | null;
  street: string;
  barangay?: string | null;
  city: string;
  province?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

export const formatSavedAddress = (address?: SavedAddress | null) =>
  address
    ? [address.street, address.barangay, address.city].filter(Boolean).join(', ')
    : '';

export const addressService = {
  list: async () => {
    return await apiFetch('/api/addresses', 'GET', undefined, true, ADDRESS_TIMEOUT_MS) as SavedAddress[];
  },

  getDefault: async () => {
    return await apiFetch('/api/addresses/default', 'GET', undefined, true, ADDRESS_TIMEOUT_MS) as SavedAddress | null;
  },

  create: async (input: SaveAddressInput) => {
    return await apiFetch('/api/addresses', 'POST', input, true, ADDRESS_TIMEOUT_MS) as SavedAddress;
  },

  update: async (addressId: string, input: SaveAddressInput) => {
    return await apiFetch(`/api/addresses/${addressId}`, 'PUT', input, true, ADDRESS_TIMEOUT_MS) as SavedAddress;
  },

  setDefault: async (addressId: string) => {
    return await apiFetch(`/api/addresses/${addressId}/default`, 'PUT', {}, true, ADDRESS_TIMEOUT_MS) as SavedAddress;
  },

  remove: async (addressId: string) => {
    await apiFetch(`/api/addresses/${addressId}`, 'DELETE', undefined, true, ADDRESS_TIMEOUT_MS);
  },
};
