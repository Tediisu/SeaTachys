import { readCachedValue, writeCachedValue } from '@/utils/cache-store';
import { adminMenuService, type AdminCategory, type AdminMenuItem } from './admin-menu.services';
import { homePromoService, type HomePromoSlide, type HomeTopBanner } from './home-promo.services';
import { menuService, type MenuCategoryDto, type MenuItemDto } from './menu.services';

export type PublicBootstrapData = {
  categories: MenuCategoryDto[];
  items: MenuItemDto[];
  promos: HomePromoSlide[];
  banner: HomeTopBanner | null;
};

export type AdminBootstrapData = {
  categories: AdminCategory[];
  items: AdminMenuItem[];
  promos: HomePromoSlide[];
  banner: HomeTopBanner | null;
};

export type CachedBootstrap<T> = {
  data: T;
  updatedAt: string;
};

const PUBLIC_BOOTSTRAP_KEY = 'bootstrap_public_v1';
const ADMIN_BOOTSTRAP_KEY = 'bootstrap_admin_v1';

export const bootstrapService = {
  readPublicCache: async (): Promise<CachedBootstrap<PublicBootstrapData> | null> => {
    return await readCachedValue<PublicBootstrapData>(PUBLIC_BOOTSTRAP_KEY);
  },

  readAdminCache: async (): Promise<CachedBootstrap<AdminBootstrapData> | null> => {
    return await readCachedValue<AdminBootstrapData>(ADMIN_BOOTSTRAP_KEY);
  },

  refreshPublicData: async (): Promise<CachedBootstrap<PublicBootstrapData>> => {
    const cached = await readCachedValue<PublicBootstrapData>(PUBLIC_BOOTSTRAP_KEY);

    const [categoriesResult, itemsResult, promosResult, bannerResult] = await Promise.allSettled([
      menuService.getCategories(),
      menuService.getItems(),
      homePromoService.getPublicPromos(),
      homePromoService.getPublicBanner(),
    ]);

    const categories =
      categoriesResult.status === 'fulfilled'
        ? categoriesResult.value
        : cached?.data.categories ?? [];

    const items =
      itemsResult.status === 'fulfilled'
        ? itemsResult.value
        : cached?.data.items ?? [];

    const promos =
      promosResult.status === 'fulfilled'
        ? promosResult.value
        : cached?.data.promos ?? [];

    const banner =
      bannerResult.status === 'fulfilled'
        ? bannerResult.value
        : cached?.data.banner ?? null;

    return await writeCachedValue(PUBLIC_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
      banner,
    });
  },

  refreshPublicShellData: async (): Promise<CachedBootstrap<PublicBootstrapData>> => {
    const cached = await readCachedValue<PublicBootstrapData>(PUBLIC_BOOTSTRAP_KEY);

    const [promos, banner] = await Promise.all([
      homePromoService.getPublicPromos().catch(() => cached?.data.promos ?? [] as HomePromoSlide[]),
      homePromoService.getPublicBanner().catch(() => cached?.data.banner ?? null),
    ]);

    // Re-read the latest cache before writing so a slower shell prime
    // never overwrites newer categories/items fetched by a full refresh.
    const latestCached = await readCachedValue<PublicBootstrapData>(PUBLIC_BOOTSTRAP_KEY);
    const preservedData = latestCached?.data ?? cached?.data;

    return await writeCachedValue(PUBLIC_BOOTSTRAP_KEY, {
      categories: preservedData?.categories ?? [],
      items: preservedData?.items ?? [],
      promos,
      banner,
    });
  },

  refreshAdminData: async (): Promise<CachedBootstrap<AdminBootstrapData>> => {
    const cached = await readCachedValue<AdminBootstrapData>(ADMIN_BOOTSTRAP_KEY);

    const categories = await adminMenuService
      .getCategories()
      .catch((error) => {
        console.log('Admin categories refresh failed:', error);
        return cached?.data.categories ?? [];
      });

    const items = await adminMenuService
      .getItems()
      .catch((error) => {
        console.log('Admin items refresh failed:', error);
        return cached?.data.items ?? [];
      });

    const promos = await homePromoService
      .getAdminPromos()
      .catch((error) => {
        console.log('Admin promos refresh failed:', error);
        return cached?.data.promos ?? [] as HomePromoSlide[];
      });

    const banner = await homePromoService
      .getAdminBanner()
      .catch((error) => {
        console.log('Admin banner refresh failed:', error);
        return cached?.data.banner ?? null;
      });

    return await writeCachedValue(ADMIN_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
      banner,
    });
  },
};
