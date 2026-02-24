import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useUpdateAppointment } from '@/api/appointments';
import { useCashSession, useOpenCashSession, useCloseCashSession } from '@/api/payments';
import { formatCurrency, formatTime } from '@/lib/utils';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import type { Appointment } from '@/types';

interface DailyAppointmentsProps {
  appointments: Appointment[];
  date: string;
  onDateChange: (date: string) => void;
  tenantId: string | null;
}

export function DailyAppointments({
  appointments,
  date,
  onDateChange,
  tenantId,
}: DailyAppointmentsProps) {
  const updateAppointment = useUpdateAppointment();
  const { data: cashSession } = useCashSession(tenantId);
  const openCash = useOpenCashSession();
  const closeCash = useCloseCashSession();
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');

  const dailyAppts = appointments
    .filter((a) => a.date?.split('T')[0] === date)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));

  const navigateDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleCheckIn = async (apt: Appointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: apt.id,
        status: 'en_progreso',
        check_in_time: new Date().toISOString(),
      });
      toast.success('Check-in realizado');
    } catch {
      toast.error('Error en check-in');
    }
  };

  const handleCheckOut = async (apt: Appointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: apt.id,
        status: 'completada',
        check_out_time: new Date().toISOString(),
      });
      toast.success('Check-out realizado');
    } catch {
      toast.error('Error en check-out');
    }
  };

  const handleOpenCash = async () => {
    try {
      await openCash.mutateAsync({
        tenant_id: tenantId!,
        opening_amount: Number(cashAmount) || 0,
      });
      toast.success('Caja abierta');
      setShowCashModal(false);
      setCashAmount('');
    } catch {
      toast.error('Error al abrir caja');
    }
  };

  const handleCloseCash = async () => {
    if (!cashSession?.id) return;
    try {
      await closeCash.mutateAsync({
        session_id: cashSession.id,
        closing_amount: 0,
      });
      toast.success('Caja cerrada');
    } catch {
      toast.error('Error al cerrar caja');
    }
  };

  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateDate(-1)} className="rounded-lg p-1 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <CardTitle className="text-sm capitalize">{formattedDate}</CardTitle>
          <button onClick={() => navigateDate(1)} className="rounded-lg p-1 hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cash session */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
          <div className="flex items-center gap-2 text-xs">
            <Banknote className="h-4 w-4 text-green-600" />
            <span className="font-medium">
              {cashSession?.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada'}
            </span>
          </div>
          {cashSession?.status === 'open' ? (
            <Button variant="ghost" size="sm" onClick={handleCloseCash}>
              Cerrar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowCashModal(true)}>
              Abrir
            </Button>
          )}
        </div>

        {/* Appointments list */}
        <div className="text-xs text-gray-500">{dailyAppts.length} citas</div>

        {dailyAppts.map((apt) => (
          <div key={apt.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{apt.client?.name ?? 'Cliente'}</p>
                <p className="text-xs text-gray-500">{apt.service?.name}</p>
              </div>
              <Badge className={APPOINTMENT_STATUS_COLORS[apt.status] ?? ''}>
                {apt.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {apt.start_time}
              {apt.stylist?.name && (
                <span className="ml-2">- {apt.stylist.name}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              {(apt.status === 'pendiente' || apt.status === 'confirmada') && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleCheckIn(apt)}
                  loading={updateAppointment.isPending}
                >
                  <LogIn className="h-3 w-3" />
                  Check-in
                </Button>
              )}
              {apt.status === 'en_progreso' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCheckOut(apt)}
                  loading={updateAppointment.isPending}
                >
                  <LogOut className="h-3 w-3" />
                  Check-out
                </Button>
              )}
              {apt.status === 'completada' && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Completada
                </div>
              )}
            </div>
          </div>
        ))}

        {dailyAppts.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">
            No hay citas para este dia
          </p>
        )}
      </CardContent>

      {/* Open cash modal */}
      <Modal open={showCashModal} onClose={() => setShowCashModal(false)} title="Abrir Caja" size="sm">
        <div className="space-y-4">
          <Input
            label="Monto inicial"
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="0"
          />
          <Button className="w-full" onClick={handleOpenCash} loading={openCash.isPending}>
            Abrir Caja
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
