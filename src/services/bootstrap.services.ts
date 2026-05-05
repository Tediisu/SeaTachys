import { readCachedValue, writeCachedValue } from '@/utils/cache-store';
import { adminMenuService, type AdminCategory, type AdminMenuItem } from './admin-menu.services';
import { homePromoService, type HomePromoSlide } from './home-promo.services';
import { menuService, type MenuCategoryDto, type MenuItemDto } from './menu.services';

export type PublicBootstrapData = {
  categories: MenuCategoryDto[];
  items: MenuItemDto[];
  promos: HomePromoSlide[];
};

export type AdminBootstrapData = {
  categories: AdminCategory[];
  items: AdminMenuItem[];
  promos: HomePromoSlide[];
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
    const [categories, items, promos] = await Promise.all([
      menuService.getCategories(),
      menuService.getItems(),
      homePromoService.getPublicPromos().catch(() => [] as HomePromoSlide[]),
    ]);

    return await writeCachedValue(PUBLIC_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
    });
  },

  refreshAdminData: async (): Promise<CachedBootstrap<AdminBootstrapData>> => {
    const [categories, items, promos] = await Promise.all([
      adminMenuService.getCategories(),
      adminMenuService.getItems(),
      homePromoService.getAdminPromos().catch(() => [] as HomePromoSlide[]),
    ]);

    return await writeCachedValue(ADMIN_BOOTSTRAP_KEY, {
      categories,
      items,
      promos,
    });
  },
};
