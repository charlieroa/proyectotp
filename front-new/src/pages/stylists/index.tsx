import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Phone, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { getTenantIdFromToken } from '@/lib/auth';
import { useStylists, useCreateUser } from '@/api/users';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import type { User } from '@/types';

interface StylistForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export default function StylistsPage() {
  const tenantId = getTenantIdFromToken();
  const { data: stylists, isLoading } = useStylists(tenantId);
  const createUser = useCreateUser();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { register, handleSubmit, reset } = useForm<StylistForm>();

  const filtered = (stylists ?? []).filter((s: User) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const onCreateSubmit = async (data: StylistForm) => {
    try {
      await createUser.mutateAsync({
        ...data,
        role_id: 3,
        tenant_id: tenantId,
      });
      toast.success('Estilista creado');
      setShowCreate(false);
      reset();
    } catch {
      toast.error('Error al crear estilista');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estilistas</h1>
          <p className="text-sm text-gray-500">{filtered.length} estilistas registrados</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Estilista
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar estilista..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((stylist: User) => (
          <Link key={stylist.id} to={`/stylists/${stylist.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                <div className="flex items-center gap-4">
                  <Avatar name={stylist.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{stylist.name}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{stylist.email}</span>
                    </div>
                    {stylist.phone && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        {stylist.phone}
                      </div>
                    )}
                  </div>
                  <Badge variant={stylist.is_active !== false ? 'success' : 'danger'}>
                    {stylist.is_active !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          No se encontraron estilistas
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Estilista">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input label="Nombre" {...register('name', { required: true })} />
          <Input label="Email" type="email" {...register('email', { required: true })} />
          <Input label="Telefono" {...register('phone')} />
          <Input label="Contrasena" type="password" {...register('password', { required: true })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
