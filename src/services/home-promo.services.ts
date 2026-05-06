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

export type HomeTopBanner = {
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  accentText: string;
  imageUrl?: string | null;
};

export const homePromoService = {
  getPublicPromos: async () => {
    return await apiFetch('/api/home/promos', 'GET', undefined, false) as HomePromoSlide[];
  },

  getPublicBanner: async () => {
    return await apiFetch('/api/home/banner', 'GET', undefined, false) as HomeTopBanner;
  },

  getAdminPromos: async () => {
    return await apiFetch('/api/admin/home-promos') as HomePromoSlide[];
  },

  getAdminBanner: async () => {
    return await apiFetch('/api/admin/home-banner') as HomeTopBanner;
  },

  updatePromos: async (slides: HomePromoSlide[]) => {
    return await apiFetch('/api/admin/home-promos', 'PUT', { slides }) as HomePromoSlide[];
  },

  updateBanner: async (banner: HomeTopBanner) => {
    return await apiFetch('/api/admin/home-banner', 'PUT', { banner }) as HomeTopBanner;
  },
};
