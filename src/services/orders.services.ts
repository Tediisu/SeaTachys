import { apiFetch } from './api';

export type OrderQuoteItemInput = {
  menuItemId: string;
  quantity: number;
  optionChoiceIds: string[];
  specialInstructions?: string;
};

export type OrderQuoteResponse = {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
};

export type CreateOrderInput = {
  deliveryStreet: string;
  deliveryBarangay?: string;
  deliveryCity: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  customerNote?: string;
  items: OrderQuoteItemInput[];
};

export const ordersService = {
  quote: async (items: OrderQuoteItemInput[]) => {
    return await apiFetch('/api/orders/quote', 'POST', { items });
  },

  create: async (input: CreateOrderInput) => {
    return await apiFetch('/api/orders', 'POST', {
      deliveryStreet: input.deliveryStreet,
      deliveryBarangay: input.deliveryBarangay ?? null,
      deliveryCity: input.deliveryCity,
      deliveryLat: input.deliveryLat ?? null,
      deliveryLng: input.deliveryLng ?? null,
      customerNote: input.customerNote ?? null,
      items: input.items,
    });
  },

  listMine: async () => {
    return await apiFetch('/api/orders');
  },
};
