import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { getTenantIdFromToken } from '@/lib/auth';
import { useUsers } from '@/api/users';
import { useAppointments } from '@/api/appointments';
import type { User } from '@/types';

export default function StylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = getTenantIdFromToken();
  const { data: users, isLoading } = useUsers(tenantId);
  const { data: appointments = [] } = useAppointments(tenantId);

  if (isLoading) return <PageSpinner />;

  const stylist = (users ?? []).find((u: User) => u.id === id);

  if (!stylist) {
    return (
      <div className="py-12 text-center text-gray-500">
        Estilista no encontrado.{' '}
        <Link to="/stylists" className="text-primary-600 hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const stylistAppointments = appointments.filter((a) => a.stylist_id === id);

  return (
    <div className="space-y-6">
      <Link to="/stylists" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Volver a Estilistas
      </Link>

      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <Avatar name={stylist.name} size="lg" />
            <div>
              <h1 className="text-xl font-bold">{stylist.name}</h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {stylist.email}
                </span>
                {stylist.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {stylist.phone}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={stylist.is_active !== false ? 'success' : 'danger'} className="ml-auto">
              {stylist.is_active !== false ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Citas Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stylistAppointments.length > 0 ? (
            <div className="space-y-3">
              {stylistAppointments.slice(0, 10).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{apt.client?.name ?? 'Cliente'}</p>
                    <p className="text-xs text-gray-500">{apt.service?.name ?? 'Servicio'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{apt.date}</p>
                    <Badge variant={apt.status === 'completada' ? 'success' : 'default'}>
                      {apt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">No hay citas recientes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
