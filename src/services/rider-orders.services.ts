import { apiFetch } from './api';
import type { AdminOrder, AdminOrderStatus, AdminOrderStatusUpdate } from './admin-orders.services';

const RIDER_ORDER_TIMEOUT_MS = 30000;

export type RiderOrder = AdminOrder;

export const riderOrdersService = {
  listAvailable: async () => {
    return await apiFetch('/api/rider/orders/available', 'GET', undefined, true, RIDER_ORDER_TIMEOUT_MS) as RiderOrder[];
  },

  listMine: async () => {
    return await apiFetch('/api/rider/orders/mine', 'GET', undefined, true, RIDER_ORDER_TIMEOUT_MS) as RiderOrder[];
  },

  accept: async (orderId: string) => {
    return await apiFetch(`/api/rider/orders/${orderId}/accept`, 'POST', {}, true, RIDER_ORDER_TIMEOUT_MS) as AdminOrderStatusUpdate;
  },

  updateStatus: async (orderId: string, status: AdminOrderStatus) => {
    return await apiFetch(
      `/api/rider/orders/${orderId}/status`,
      'POST',
      { status },
      true,
      RIDER_ORDER_TIMEOUT_MS
    ) as AdminOrderStatusUpdate;
  },
};
