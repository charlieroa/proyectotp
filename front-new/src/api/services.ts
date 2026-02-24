import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Service } from '@/types';

export function useServices(tenantId: string | null) {
  return useQuery({
    queryKey: ['services', tenantId],
    queryFn: async () => {
      const res = await api.get(`/services/tenant/${tenantId}`);
      return res.data as Service[];
    },
    enabled: !!tenantId,
  });
}

export function useServiceStylists(serviceId: string | null) {
  return useQuery({
    queryKey: ['service-stylists', serviceId],
    queryFn: async () => {
      const res = await api.get(`/services/${serviceId}/stylists`);
      return res.data;
    },
    enabled: !!serviceId,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/services', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await api.put(`/services/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/services/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}
