import { apiFetch } from './api';

const RIDER_PROFILE_TIMEOUT_MS = 30000;

export type RiderProfile = {
  userId: string;
  fullName: string;
  motorModel: string;
  contactNumber: string;
  updatedAt: string;
};

export type SaveRiderProfileInput = {
  motorModel: string;
  contactNumber: string;
};

export const riderProfileService = {
  get: async () => {
    return await apiFetch('/api/rider/profile', 'GET', undefined, true, RIDER_PROFILE_TIMEOUT_MS) as RiderProfile | null;
  },

  save: async (input: SaveRiderProfileInput) => {
    return await apiFetch('/api/rider/profile', 'PUT', input, true, RIDER_PROFILE_TIMEOUT_MS) as RiderProfile;
  },
};
