import { apiFetch } from './api';

const ADMIN_ORDER_READ_TIMEOUT_MS = 30000;
const ADMIN_ORDER_WRITE_TIMEOUT_MS = 30000;

export type AdminOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type AdminOrderOption = {
  groupLabel: string;
  choiceName: string;
  additionalPrice: number;
};

export type AdminOrderItem = {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  specialInstructions?: string | null;
  options: AdminOrderOption[];
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  riderId?: string | null;
  status: AdminOrderStatus;
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
  items: AdminOrderItem[];
};

export type AdminOrderStatusUpdate = {
  id: string;
  status: AdminOrderStatus;
  riderId?: string | null;
  confirmedAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
};

export const adminOrdersService = {
  list: async (status?: AdminOrderStatus) => {
    const query = status ? `?status=${status}` : '';
    return await apiFetch(`/api/admin/orders${query}`, 'GET', undefined, true, ADMIN_ORDER_READ_TIMEOUT_MS);
  },

  updateStatus: async (orderId: string, status: AdminOrderStatus, riderId?: string | null) => {
    return await apiFetch(
      `/api/admin/orders/${orderId}/status`,
      'POST',
      {
        status,
        riderId: riderId ?? null,
      },
      true,
      ADMIN_ORDER_WRITE_TIMEOUT_MS
    );
  },
};
