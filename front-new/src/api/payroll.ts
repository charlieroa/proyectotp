import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Payroll } from '@/types';

export function usePayrolls(tenantId: string | null, params?: { period?: string }) {
  return useQuery({
    queryKey: ['payrolls', tenantId, params],
    queryFn: async () => {
      const res = await api.get(`/payroll/tenant/${tenantId}`, { params });
      return res.data as Payroll[];
    },
    enabled: !!tenantId,
  });
}

export function usePayrollPreview(tenantId: string | null, params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['payroll-preview', tenantId, params],
    queryFn: async () => {
      const res = await api.get(`/payroll/preview/${tenantId}`, { params });
      return res.data;
    },
    enabled: !!tenantId && !!params?.start && !!params?.end,
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/payroll/generate', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payrolls'] }),
  });
}
