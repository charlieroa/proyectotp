import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Appointment } from '@/types';

export function useAppointments(tenantId: string | null, params?: { date?: string; status?: string }) {
  return useQuery({
    queryKey: ['appointments', tenantId, params],
    queryFn: async () => {
      const res = await api.get(`/appointments/tenant/${tenantId}`, { params });
      return res.data as Appointment[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/appointments', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useCreateBatchAppointments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/appointments/batch', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await api.put(`/appointments/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useAvailableSlots(params: { date?: string; service_id?: string; tenant_id?: string }) {
  return useQuery({
    queryKey: ['slots', params],
    queryFn: async () => {
      const res = await api.get('/appointments/tenant/slots', { params });
      return res.data as string[];
    },
    enabled: !!params.date && !!params.service_id,
  });
}

export function useAvailableStylists(params: { date?: string; time?: string; service_id?: string }) {
  return useQuery({
    queryKey: ['available-stylists', params],
    queryFn: async () => {
      const res = await api.get('/appointments/stylists/available', { params });
      return res.data;
    },
    enabled: !!params.date && !!params.time && !!params.service_id,
  });
}

export function useDigiturnoQueue(tenantId: string | null) {
  return useQuery({
    queryKey: ['digiturno', tenantId],
    queryFn: async () => {
      const res = await api.get(`/appointments/digiturno/queue/${tenantId}`);
      return res.data;
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });
}
