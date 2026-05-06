import { apiFetch } from './api';

export type HomePromoSlide = {
  position: number;
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statLabel: string;
  statValue: string;
  imageUrl?: string | null;
};

export const homePromoService = {
  getPublicPromos: async () => {
    return await apiFetch('/api/home/promos', 'GET', undefined, false) as HomePromoSlide[];
  },

  getAdminPromos: async () => {
    return await apiFetch('/api/admin/home-promos') as HomePromoSlide[];
  },

  updatePromos: async (slides: HomePromoSlide[]) => {
    return await apiFetch('/api/admin/home-promos', 'PUT', { slides }) as HomePromoSlide[];
  },
};
