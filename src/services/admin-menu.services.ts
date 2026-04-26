import { apiFetch } from './api';

export type AdminCategory = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type AdminMenuItem = {
  id: string;
  categoryId?: string | null;
  category?: AdminCategory | null;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

export type CreateAdminMenuItemInput = {
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder?: number;
};

export type UpdateAdminMenuItemInput = CreateAdminMenuItemInput;

export type AdminCategoryInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

export const adminMenuService = {
  getCategories: async () => {
    return await apiFetch('/api/admin/menu/categories');
  },

  createCategory: async (input: AdminCategoryInput) => {
    return await apiFetch('/api/admin/menu/categories', 'POST', {
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    });
  },

  updateCategory: async (id: string, input: AdminCategoryInput) => {
    return await apiFetch(`/api/admin/menu/categories/${id}`, 'PUT', {
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    });
  },

  deleteCategory: async (id: string) => {
    return await apiFetch(`/api/admin/menu/categories/${id}`, 'DELETE');
  },

  getItems: async () => {
    return await apiFetch('/api/admin/menu/items');
  },

  createItem: async (input: CreateAdminMenuItemInput) => {
    return await apiFetch('/api/admin/menu/items', 'POST', {
      categoryId: input.categoryId ?? null,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
      displayOrder: input.displayOrder ?? 0,
    });
  },

  updateItem: async (id: string, input: UpdateAdminMenuItemInput) => {
    return await apiFetch(`/api/admin/menu/items/${id}`, 'PUT', {
      categoryId: input.categoryId ?? null,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
      displayOrder: input.displayOrder ?? 0,
    });
  },

  deleteItem: async (id: string) => {
    return await apiFetch(`/api/admin/menu/items/${id}`, 'DELETE');
  },
};
