import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export function useAdminChat() {
  return useMutation({
    mutationFn: async (data: { message: string; conversation_id?: string; tenant_id?: string }) => {
      const res = await api.post('/ai-admin-chat', data);
      return res.data as { reply: string; conversation_id: string };
    },
  });
}

export function useClientChat() {
  return useMutation({
    mutationFn: async (data: { message: string; conversation_id?: string; tenant_id?: string }) => {
      const res = await api.post('/ai-chat', data);
      return res.data as { reply: string; conversation_id: string };
    },
  });
}
