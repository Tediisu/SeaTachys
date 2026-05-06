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
    const [categories, items, promos, banner] = await Promise.all([
      menuService.getCategories(),
      menuService.getItems(),
      homePromoService.getPublicPromos().catch(() => [] as HomePromoSlide[]),
      homePromoService.getPublicBanner().catch(() => null),
    ]);

    return await writeCachedValue(PUBLIC_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
      banner,
    });
  },

  refreshAdminData: async (): Promise<CachedBootstrap<AdminBootstrapData>> => {
    const [categories, items, promos, banner] = await Promise.all([
      adminMenuService.getCategories(),
      adminMenuService.getItems(),
      homePromoService.getAdminPromos().catch(() => [] as HomePromoSlide[]),
      homePromoService.getAdminBanner().catch(() => null),
    ]);

    return await writeCachedValue(ADMIN_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
      banner,
    });
  },
};
