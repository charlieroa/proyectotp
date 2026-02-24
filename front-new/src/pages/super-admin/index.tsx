import { useState } from 'react';
import { Shield, Building2, Users, Settings, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { useAllTenants } from '@/api/tenants';

const superTabs = [
  { id: 'tenants', label: 'Negocios', icon: <Building2 className="h-4 w-4" /> },
  { id: 'usage', label: 'Uso de Tokens', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'settings', label: 'Config Global', icon: <Settings className="h-4 w-4" /> },
];

export default function SuperAdminPage() {
  const { data: tenants, isLoading } = useAllTenants();
  const [activeTab, setActiveTab] = useState('tenants');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
          <Shield className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-sm text-gray-500">Panel de administracion global</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Negocios</p>
              <p className="text-2xl font-bold">{(tenants ?? []).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold">
                {(tenants ?? []).filter((t) => t.is_active !== false).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tokens IA</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs tabs={superTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'tenants' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negocio</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tenants ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.email ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="primary">{t.plan_id ? `Plan ${t.plan_id}` : 'Free'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active !== false ? 'success' : 'danger'}>
                      {t.is_active !== false ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{t.created_at ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeTab === 'usage' && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <BarChart3 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>Monitoreo de uso de tokens IA por negocio</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Settings className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>Configuracion global del sistema</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
