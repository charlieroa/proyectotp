import { useState } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Bot,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { getTenantIdFromToken } from '@/lib/auth';
import { useAppointments } from '@/api/appointments';
import { useStylists } from '@/api/users';

const dashboardTabs = [
  { id: 'overview', label: 'Resumen', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'calendar', label: 'Calendario', icon: <Calendar className="h-4 w-4" /> },
  { id: 'ai', label: 'Asistente IA', icon: <Bot className="h-4 w-4" /> },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const tenantId = getTenantIdFromToken();
  const [activeTab, setActiveTab] = useState('overview');
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments = [] } = useAppointments(tenantId, { date: today });
  const { data: stylists = [] } = useStylists(tenantId);

  const todayAppointments = appointments.length;
  const completedToday = appointments.filter((a) => a.status === 'completada').length;
  const pendingToday = appointments.filter((a) => a.status === 'pendiente' || a.status === 'confirmada').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.name?.split(' ')[0] ?? 'Admin'}
        </h1>
        <p className="text-sm text-gray-500">
          Resumen de tu negocio para hoy
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Citas Hoy</p>
              <p className="text-2xl font-bold">{todayAppointments}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold">{completedToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold">{pendingToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Estilistas</p>
              <p className="text-2xl font-bold">{stylists.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs tabs={dashboardTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">Resumen del dia</p>
            <p className="text-sm">
              {todayAppointments > 0
                ? `Tienes ${todayAppointments} citas programadas para hoy.`
                : 'No hay citas programadas para hoy.'}
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'calendar' && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>Vista rapida del calendario. Para el calendario completo, ve a la seccion de Calendario.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'ai' && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Bot className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>Asistente IA disponible. Ve a la seccion de Asistente IA para una experiencia completa.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
