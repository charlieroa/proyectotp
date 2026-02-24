import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarDays, Clock, User, Scissors } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTenantIdFromToken } from '@/lib/auth';
import {
  useCreateAppointment,
  useUpdateAppointment,
  useAvailableSlots,
  useAvailableStylists,
} from '@/api/appointments';
import { useServices } from '@/api/services';
import { useClients, useCreateUser } from '@/api/users';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  selectedEvent?: Record<string, unknown> | null;
  tenantId: string | null;
  allowPastAppointments?: boolean;
}

interface AppointmentForm {
  client_id: string;
  service_id: string;
  date: string;
  start_time: string;
  stylist_id: string;
  notes: string;
}

export function AppointmentModal({
  open,
  onClose,
  defaultDate = '',
  selectedEvent,
  tenantId,
  allowPastAppointments = false,
}: AppointmentModalProps) {
  const isEditing = !!selectedEvent;
  const { data: services = [] } = useServices(tenantId);
  const { data: clients = [] } = useClients(tenantId);
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const createUser = useCreateUser();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AppointmentForm>({
    defaultValues: {
      client_id: '',
      service_id: '',
      date: defaultDate,
      start_time: '',
      stylist_id: '',
      notes: '',
    },
  });

  const watchDate = watch('date');
  const watchServiceId = watch('service_id');
  const watchStartTime = watch('start_time');

  // Fetch available slots when date + service change
  const { data: slots = [] } = useAvailableSlots({
    date: watchDate,
    service_id: watchServiceId,
    tenant_id: tenantId ?? undefined,
  });

  // Fetch available stylists when date + time + service change
  const { data: availableStylists = [] } = useAvailableStylists({
    date: watchDate,
    time: watchStartTime,
    service_id: watchServiceId,
  });

  // Sort stylists: free first
  const sortedStylists = useMemo(() => {
    const list = Array.isArray(availableStylists) ? availableStylists : [];
    return [...list].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      return (a.is_busy ? 1 : 0) - (b.is_busy ? 1 : 0);
    });
  }, [availableStylists]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (selectedEvent) {
        reset({
          client_id: String(selectedEvent.client_id ?? ''),
          service_id: String(selectedEvent.service_id ?? ''),
          date: String(selectedEvent.date ?? defaultDate).split('T')[0],
          start_time: String(selectedEvent.start_time ?? ''),
          stylist_id: String(selectedEvent.stylist_id ?? ''),
          notes: String(selectedEvent.notes ?? ''),
        });
      } else {
        reset({
          client_id: '',
          service_id: '',
          date: defaultDate,
          start_time: '',
          stylist_id: '',
          notes: '',
        });
      }
    }
  }, [open, selectedEvent, defaultDate, reset]);

  // New client inline creation
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const res = await createUser.mutateAsync({
        name: newClientName,
        phone: newClientPhone,
        role_id: 4,
        tenant_id: tenantId,
      });
      const resData = res as Record<string, unknown>;
      const newId = resData.id ?? (resData.user as Record<string, unknown> | undefined)?.id;
      if (newId) setValue('client_id', String(newId));
      setShowNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      toast.success('Cliente creado');
    } catch {
      toast.error('Error al crear cliente');
    }
  };

  const onSubmit = async (data: AppointmentForm) => {
    // Validate past date
    if (!allowPastAppointments && !isEditing) {
      const now = new Date();
      const selectedDt = new Date(`${data.date}T${data.start_time}`);
      if (selectedDt < now) {
        toast.error('No se pueden crear citas en el pasado');
        return;
      }
    }

    try {
      if (isEditing) {
        await updateAppointment.mutateAsync({
          id: String(selectedEvent!.id),
          client_id: data.client_id,
          service_id: data.service_id,
          stylist_id: data.stylist_id,
          start_time: data.start_time,
          notes: data.notes,
        });
        toast.success('Cita actualizada');
      } else {
        await createAppointment.mutateAsync({
          client_id: data.client_id,
          service_id: data.service_id,
          stylist_id: data.stylist_id,
          date: data.date,
          start_time: data.start_time,
          tenant_id: tenantId,
          notes: data.notes,
        });
        toast.success('Cita creada');
      }
      onClose();
    } catch {
      toast.error(isEditing ? 'Error al actualizar cita' : 'Error al crear cita');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Cita' : 'Nueva Cita'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Client */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              <User className="mr-1 inline h-4 w-4" />
              Cliente
            </label>
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              className="text-xs text-primary-600 hover:underline"
            >
              {showNewClient ? 'Cancelar' : '+ Nuevo Cliente'}
            </button>
          </div>
          {showNewClient ? (
            <div className="mt-2 flex gap-2">
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nombre"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Telefono"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="button" size="sm" onClick={handleCreateClient} loading={createUser.isPending}>
                Crear
              </Button>
            </div>
          ) : (
            <Select
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Seleccionar cliente"
              {...register('client_id', { required: !isEditing ? 'Seleccione un cliente' : false })}
              error={errors.client_id?.message}
            />
          )}
        </div>

        {/* Service */}
        <Select
          label="Servicio"
          options={services.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.duration}min - $${s.price.toLocaleString()})`,
          }))}
          placeholder="Seleccionar servicio"
          {...register('service_id', { required: 'Seleccione un servicio' })}
          error={errors.service_id?.message}
        />

        {/* Date */}
        <Input
          label="Fecha"
          type="date"
          {...register('date', { required: 'Seleccione una fecha' })}
          error={errors.date?.message}
        />

        {/* Time slot */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Clock className="mr-1 inline h-4 w-4" />
            Horario
          </label>
          {slots.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {slots.map((slot: string) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setValue('start_time', slot)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    watchStartTime === slot
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : watchDate && watchServiceId ? (
            <p className="mt-2 text-sm text-gray-500">No hay horarios disponibles</p>
          ) : (
            <p className="mt-2 text-sm text-gray-400">Seleccione servicio y fecha primero</p>
          )}
          {errors.start_time && (
            <p className="mt-1 text-xs text-red-600">{errors.start_time.message}</p>
          )}
          <input type="hidden" {...register('start_time', { required: 'Seleccione un horario' })} />
        </div>

        {/* Stylist */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Scissors className="mr-1 inline h-4 w-4" />
            Estilista
          </label>
          {sortedStylists.length > 0 ? (
            <div className="mt-2 space-y-2">
              {sortedStylists.map((sty: Record<string, unknown>) => (
                <button
                  key={String(sty.id)}
                  type="button"
                  onClick={() => setValue('stylist_id', String(sty.id))}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                    watch('stylist_id') === String(sty.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{String(sty.first_name ?? sty.name ?? 'Estilista')}</span>
                  <Badge variant={sty.is_busy ? 'warning' : 'success'}>
                    {sty.is_busy ? 'Ocupado' : 'Libre'}
                  </Badge>
                </button>
              ))}
            </div>
          ) : watchStartTime ? (
            <p className="mt-2 text-sm text-gray-500">No hay estilistas disponibles</p>
          ) : (
            <p className="mt-2 text-sm text-gray-400">Seleccione horario primero</p>
          )}
          <input type="hidden" {...register('stylist_id', { required: 'Seleccione un estilista' })} />
          {errors.stylist_id && (
            <p className="mt-1 text-xs text-red-600">{errors.stylist_id.message}</p>
          )}
        </div>

        {/* Notes */}
        <Input label="Notas (opcional)" {...register('notes')} placeholder="Notas adicionales..." />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={createAppointment.isPending || updateAppointment.isPending}
          >
            {isEditing ? 'Actualizar' : 'Crear Cita'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
