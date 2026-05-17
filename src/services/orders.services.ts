import { apiFetch } from './api';

const ORDER_READ_TIMEOUT_MS = 30000;
const ORDER_WRITE_TIMEOUT_MS = 45000;

export type OrderQuoteItemInput = {
  menuItemId: string;
  quantity: number;
  optionChoiceIds: string[];
  specialInstructions?: string;
};

export type FulfillmentType = 'delivery' | 'pickup';

export type OrderQuoteResponse = {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type OrderOption = {
  groupLabel: string;
  choiceName: string;
  additionalPrice: number;
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  specialInstructions?: string | null;
  options: OrderOption[];
};

export type RiderSummary = {
  fullName: string;
  motorModel?: string | null;
  contactNumber?: string | null;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  riderId?: string | null;
  status: OrderStatus;
  deliveryStreet: string;
  deliveryBarangay?: string | null;
  deliveryCity: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  customerNote?: string | null;
  placedAt: string;
  confirmedAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
  rider?: RiderSummary | null;
  items: OrderItem[];
};

export type CreateOrderInput = {
  fulfillmentType: FulfillmentType;
  deliveryStreet?: string;
  deliveryBarangay?: string;
  deliveryCity?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  customerNote?: string;
  items: OrderQuoteItemInput[];
};

export const ordersService = {
  quote: async (items: OrderQuoteItemInput[], fulfillmentType: FulfillmentType) => {
    return await apiFetch('/api/orders/quote', 'POST', { items, fulfillmentType }, true, ORDER_READ_TIMEOUT_MS);
  },

  create: async (input: CreateOrderInput) => {
    return await apiFetch('/api/orders', 'POST', {
      fulfillmentType: input.fulfillmentType,
      deliveryStreet: input.deliveryStreet ?? '',
      deliveryBarangay: input.deliveryBarangay ?? null,
      deliveryCity: input.deliveryCity ?? '',
      deliveryLat: input.deliveryLat ?? null,
      deliveryLng: input.deliveryLng ?? null,
      customerNote: input.customerNote ?? null,
      items: input.items,
    }, true, ORDER_WRITE_TIMEOUT_MS);
  },

  listMine: async () => {
    return await apiFetch('/api/orders', 'GET', undefined, true, ORDER_READ_TIMEOUT_MS);
  },

  getById: async (orderId: string) => {
    return await apiFetch(`/api/orders/${orderId}`, 'GET', undefined, true, ORDER_READ_TIMEOUT_MS);
  },
};
