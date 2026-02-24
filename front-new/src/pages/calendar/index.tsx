import { useState, useCallback, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { AppointmentModal } from '@/components/calendar/appointment-modal';
import { DailyAppointments } from '@/components/calendar/daily-appointments';
import { useAuth } from '@/hooks/use-auth';
import { getTenantIdFromToken } from '@/lib/auth';
import { useAppointments } from '@/api/appointments';
import { useTenant } from '@/api/tenants';
import useCalendarSocket from '@/hooks/use-calendar-socket';
import { useQueryClient } from '@tanstack/react-query';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/constants';

export default function CalendarPage() {
  const tenantId = getTenantIdFromToken();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const { data: appointments = [], isLoading } = useAppointments(tenantId);
  const { data: tenant } = useTenant(tenantId);

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(null);
  const [showDaily, setShowDaily] = useState(true);
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);

  // Real-time socket updates
  useCalendarSocket({
    tenantId: tenantId ?? undefined,
    onAnyChange: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }, [queryClient]),
  });

  // Transform appointments to FullCalendar events
  const events = useMemo(() => {
    return appointments.map((apt) => {
      const start = apt.date && apt.start_time
        ? `${apt.date.split('T')[0]}T${apt.start_time}`
        : apt.date;
      const end = apt.end_time
        ? `${apt.date.split('T')[0]}T${apt.end_time}`
        : undefined;

      const statusColor: Record<string, string> = {
        pendiente: '#eab308',
        confirmada: '#3b82f6',
        en_progreso: '#8b5cf6',
        completada: '#22c55e',
        cancelada: '#ef4444',
        no_show: '#6b7280',
      };

      return {
        id: apt.id,
        title: `${apt.client?.name ?? 'Cliente'} - ${apt.service?.name ?? 'Servicio'}`,
        start,
        end,
        backgroundColor: statusColor[apt.status] ?? '#6366f1',
        borderColor: statusColor[apt.status] ?? '#6366f1',
        extendedProps: {
          ...apt,
          client_name: apt.client?.name,
          service_name: apt.service?.name,
          stylist_name: apt.stylist?.name,
        },
      };
    });
  }, [appointments]);

  const handleDateSelect = (info: DateSelectArg) => {
    const dateStr = info.startStr.split('T')[0];
    setSelectedDate(dateStr);
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps;
    setSelectedEvent({ id: info.event.id, ...props });
    setSelectedDate(props.date?.split('T')[0] ?? '');
    setShowModal(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setSelectedEvent(null); setSelectedDate(new Date().toISOString().split('T')[0]); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(APPOINTMENT_STATUS_COLORS).map(([status, cls]) => (
          <Badge key={status} className={cls}>{status}</Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <div className={showDaily ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card className="p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              locale="es"
              selectable
              selectMirror
              editable={false}
              events={events}
              select={handleDateSelect}
              eventClick={handleEventClick}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              height="auto"
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Dia',
                list: 'Lista',
              }}
              datesSet={(info) => {
                const start = info.start;
                setDailyDate(start.toISOString().split('T')[0]);
              }}
            />
          </Card>
        </div>

        {/* Daily sidebar */}
        {showDaily && (
          <div>
            <DailyAppointments
              appointments={appointments}
              date={dailyDate}
              onDateChange={setDailyDate}
              tenantId={tenantId}
            />
          </div>
        )}
      </div>

      {/* Appointment modal */}
      <AppointmentModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelectedEvent(null); }}
        defaultDate={selectedDate}
        selectedEvent={selectedEvent}
        tenantId={tenantId}
        allowPastAppointments={tenant?.allow_past_appointments ?? false}
      />
    </div>
  );
}
