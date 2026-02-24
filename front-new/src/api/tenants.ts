import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Tenant } from '@/types';

export function useTenant(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}`);
      return res.data as Tenant;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await api.put(`/tenants/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant'] }),
  });
}

export function useAllTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await api.get('/tenants');
      return res.data as Tenant[];
    },
  });
}
