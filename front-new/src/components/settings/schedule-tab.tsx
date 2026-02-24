import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { useUpdateTenant } from '@/api/tenants';
import type { Tenant } from '@/types';

interface Props {
  tenantId: string | null;
  tenant?: Tenant | null;
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type DayState = { active: boolean; start: string; end: string };
type WeekSchedule = Record<DayKey, DayState>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miercoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { active: true, start: '08:00', end: '18:00' },
  tuesday: { active: true, start: '08:00', end: '18:00' },
  wednesday: { active: true, start: '08:00', end: '18:00' },
  thursday: { active: true, start: '08:00', end: '18:00' },
  friday: { active: true, start: '08:00', end: '18:00' },
  saturday: { active: true, start: '08:00', end: '14:00' },
  sunday: { active: false, start: '08:00', end: '14:00' },
};

export function ScheduleTab({ tenantId, tenant }: Props) {
  const updateTenant = useUpdateTenant();
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);

  useEffect(() => {
    if (tenant && (tenant as unknown as Record<string, unknown>).working_hours) {
      const wh = (tenant as unknown as Record<string, unknown>).working_hours as Record<string, unknown>;
      const parsed: Partial<WeekSchedule> = {};
      for (const day of DAYS) {
        const dayData = wh[day.key] as Record<string, unknown> | undefined;
        if (dayData) {
          parsed[day.key] = {
            active: dayData.active !== false,
            start: String(dayData.start ?? dayData.open ?? '08:00'),
            end: String(dayData.end ?? dayData.close ?? '18:00'),
          };
        }
      }
      setSchedule((prev) => ({ ...prev, ...parsed }));
    }
  }, [tenant]);

  const toggleDay = (day: DayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active },
    }));
  };

  const changeHour = (day: DayKey, field: 'start' | 'end', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const applyMondayToAll = () => {
    const monday = schedule.monday;
    setSchedule((prev) => {
      const updated = { ...prev };
      for (const day of DAYS) {
        if (day.key !== 'sunday') {
          updated[day.key] = { ...monday };
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!tenantId) return;
    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        working_hours: schedule,
      });
      toast.success('Horario actualizado');
    } catch {
      toast.error('Error al actualizar horario');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Horario de Atencion</CardTitle>
        <Button variant="secondary" size="sm" onClick={applyMondayToAll}>
          Aplicar Lunes a Todos
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="w-28">
              <Toggle
                label={label}
                enabled={schedule[key].active}
                onChange={() => toggleDay(key)}
              />
            </div>
            {schedule[key].active ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={schedule[key].start}
                  onChange={(e) => changeHour(key, 'start', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-gray-400">a</span>
                <input
                  type="time"
                  value={schedule[key].end}
                  onChange={(e) => changeHour(key, 'end', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Cerrado</span>
            )}
          </div>
        ))}

        <Button onClick={handleSave} loading={updateTenant.isPending}>
          Guardar Horario
        </Button>
      </CardContent>
    </Card>
  );
}
