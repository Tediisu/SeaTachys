import { apiFetch } from './api';

const ORDER_MESSAGE_TIMEOUT_MS = 30000;

export type OrderMessage = {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'customer' | 'rider' | 'admin';
  senderName: string;
  message: string;
  sentAt: string;
};

export const orderMessagesService = {
  list: async (orderId: string) => {
    return await apiFetch(
      `/api/orders/${orderId}/messages`,
      'GET',
      undefined,
      true,
      ORDER_MESSAGE_TIMEOUT_MS
    ) as OrderMessage[];
  },

  send: async (orderId: string, message: string) => {
    return await apiFetch(
      `/api/orders/${orderId}/messages`,
      'POST',
      { message },
      true,
      ORDER_MESSAGE_TIMEOUT_MS
    ) as OrderMessage;
  },
};
