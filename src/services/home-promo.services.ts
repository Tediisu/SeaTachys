import { apiFetch } from './api';

const BANNER_READ_TIMEOUT_MS = 45000;
const BANNER_WRITE_TIMEOUT_MS = 20000;
const BANNER_RETRY_ATTEMPTS = 3;

const isTimeoutError = (error: unknown) =>
  error instanceof Error && error.message.includes('Request timed out');

async function withTimeoutRetry<T>(run: () => Promise<T>, attempts = BANNER_RETRY_ATTEMPTS): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;

      if (!isTimeoutError(error) || attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to complete banner request.');
}

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
  title: string;
  ctaLabel: string;
  accentText: string;
  imageUrl?: string | null;
};

export const homePromoService = {
  getPublicPromos: async () => {
    return await apiFetch('/api/home/promos', 'GET', undefined, false) as HomePromoSlide[];
  },

  getPublicBanner: async () => {
    return await withTimeoutRetry(
      async () => await apiFetch('/api/home/banner', 'GET', undefined, false, BANNER_READ_TIMEOUT_MS) as HomeTopBanner
    );
  },

  getAdminPromos: async () => {
    return await apiFetch('/api/admin/home-promos') as HomePromoSlide[];
  },

  getAdminBanner: async () => {
    return await withTimeoutRetry(
      async () => await apiFetch('/api/admin/home-banner', 'GET', undefined, true, BANNER_READ_TIMEOUT_MS) as HomeTopBanner
    );
  },

  updatePromos: async (slides: HomePromoSlide[]) => {
    return await apiFetch('/api/admin/home-promos', 'PUT', { slides }) as HomePromoSlide[];
  },

  updateBanner: async (banner: HomeTopBanner) => {
    return await apiFetch('/api/admin/home-banner', 'PUT', { banner }, true, BANNER_WRITE_TIMEOUT_MS) as HomeTopBanner;
  },
};
