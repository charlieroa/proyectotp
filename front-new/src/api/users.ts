import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User } from '@/types';

export function useUsers(tenantId: string | null, params?: { role_id?: number }) {
  return useQuery({
    queryKey: ['users', tenantId, params],
    queryFn: async () => {
      const res = await api.get(`/users/tenant/${tenantId}`, { params });
      return res.data as User[];
    },
    enabled: !!tenantId,
  });
}

export function useClients(tenantId: string | null) {
  return useUsers(tenantId, { role_id: 4 });
}

export function useStylists(tenantId: string | null) {
  return useUsers(tenantId, { role_id: 3 });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/users', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await api.put(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
