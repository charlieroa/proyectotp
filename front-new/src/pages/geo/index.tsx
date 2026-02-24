import { MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { getTenantIdFromToken } from '@/lib/auth';
import { useStylists } from '@/api/users';

export default function GeoPage() {
  const tenantId = getTenantIdFromToken();
  const { data: stylists, isLoading } = useStylists(tenantId);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Geolocalizacion</h1>
        <p className="text-sm text-gray-500">Seguimiento de ubicacion del personal</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map placeholder */}
        <div className="lg:col-span-2">
          <Card className="h-[500px]">
            <CardContent className="flex h-full items-center justify-center">
              <div className="text-center text-gray-400">
                <MapPin className="mx-auto mb-3 h-16 w-16" />
                <p className="text-lg font-medium">Mapa de Google Maps</p>
                <p className="text-sm">
                  Requiere configuracion de API Key de Google Maps
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stylists list */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Estilistas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stylists ?? []).map((stylist) => (
                <div key={stylist.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{stylist.name}</p>
                    <p className="text-xs text-gray-500">{stylist.email}</p>
                  </div>
                  <Badge variant={stylist.is_active !== false ? 'success' : 'default'}>
                    {stylist.is_active !== false ? 'En linea' : 'Offline'}
                  </Badge>
                </div>
              ))}
              {(stylists ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No hay estilistas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
