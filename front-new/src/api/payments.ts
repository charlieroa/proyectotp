import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Payment, CashSession } from '@/types';

export function usePayments(tenantId: string | null) {
  return useQuery({
    queryKey: ['payments', tenantId],
    queryFn: async () => {
      const res = await api.get(`/payments/tenant/${tenantId}`);
      return res.data as Payment[];
    },
    enabled: !!tenantId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/payments', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

// Cash session
export function useCashSession(tenantId: string | null) {
  return useQuery({
    queryKey: ['cash-session', tenantId],
    queryFn: async () => {
      const res = await api.get(`/cash/session/${tenantId}`);
      return res.data as CashSession | null;
    },
    enabled: !!tenantId,
  });
}

export function useOpenCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { tenant_id: string; opening_amount: number }) => {
      const res = await api.post('/cash/open', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-session'] }),
  });
}

export function useCloseCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { session_id: string; closing_amount: number }) => {
      const res = await api.post('/cash/close', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-session'] }),
  });
}
