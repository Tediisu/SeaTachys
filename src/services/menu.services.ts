import { apiFetch } from './api';

export type MenuCategoryDto = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type MenuItemDto = {
  id: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

export type MenuItemOptionChoiceDto = {
  id: string;
  groupId: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
};

export type MenuItemOptionGroupDto = {
  id: string;
  menuItemId: string;
  label: string;
  isRequired: boolean;
  maxSelections: number;
  displayOrder: number;
  choices: MenuItemOptionChoiceDto[];
};

export type MenuItemDetailDto = MenuItemDto & {
  optionGroups: MenuItemOptionGroupDto[];
};

export const menuService = {
  getCategories: async () => {
    return await apiFetch('/api/menu/categories', 'GET', undefined, false);
  },

  getItems: async () => {
    return await apiFetch('/api/menu/items', 'GET', undefined, false);
  },

  getItem: async (id: string) => {
    return await apiFetch(`/api/menu/items/${id}`, 'GET', undefined, false);
  },
};
