import { useState } from 'react';
import { BarChart3, Users, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';
import { getTenantIdFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { useAppointments } from '@/api/appointments';
import { usePayments } from '@/api/payments';

const reportTabs = [
  { id: 'resumen', label: 'Resumen', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'fichero', label: 'Fichero', icon: <Users className="h-4 w-4" /> },
];

export default function ReportsPage() {
  const tenantId = getTenantIdFromToken();
  const [activeTab, setActiveTab] = useState('resumen');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: appointments = [], isLoading: aLoading } = useAppointments(tenantId);
  const { data: payments = [], isLoading: pLoading } = usePayments(tenantId);

  const totalRevenue = payments.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === 'completada').length;

  if (aLoading || pLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">Analisis y metricas del negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400">a</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <Tabs tabs={reportTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'resumen' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Citas</p>
                  <p className="text-2xl font-bold">{totalAppointments}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completadas</p>
                  <p className="text-2xl font-bold">{completedAppointments}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>Graficos de reportes disponibles proximamente</p>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'fichero' && (
        <Card>
          <CardHeader>
            <CardTitle>Fichero (Cola de Turnos)</CardTitle>
          </CardHeader>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>Sistema de digiturno y cola de turnos</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
