import { apiFetch } from './api';

const CHATBOT_TIMEOUT_MS = 90000;

export type ChatbotMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatbotResponse = {
  reply: string;
};

export const chatbotService = {
  sendMessage: async (message: string, history: ChatbotMessage[]) => {
    return await apiFetch(
      '/api/chatbot/message',
      'POST',
      { message, history },
      true,
      CHATBOT_TIMEOUT_MS
    ) as ChatbotResponse;
  },
};
