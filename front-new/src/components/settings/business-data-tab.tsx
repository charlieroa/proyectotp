import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { useUpdateTenant } from '@/api/tenants';
import type { Tenant } from '@/types';

interface Props {
  tenantId: string | null;
  tenant?: Tenant | null;
}

interface BusinessForm {
  name: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  iva_rate: string;
  admin_fee_percent: string;
}

export function BusinessDataTab({ tenantId, tenant }: Props) {
  const updateTenant = useUpdateTenant();
  const { register, handleSubmit } = useForm<BusinessForm>({
    defaultValues: {
      name: tenant?.name ?? '',
      phone: tenant?.phone ?? '',
      address: tenant?.address ?? '',
      email: tenant?.email ?? '',
      website: '',
      iva_rate: '',
      admin_fee_percent: '',
    },
  });

  const onSubmit = async (data: BusinessForm) => {
    if (!tenantId) return;
    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        email: data.email,
      });
      toast.success('Datos actualizados');
    } catch {
      toast.error('Error al actualizar datos');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informacion del Negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre del negocio" {...register('name')} />
              <Input label="Telefono" {...register('phone')} />
            </div>
            <Input label="Direccion" {...register('address')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" {...register('email')} />
              <Input label="Sitio Web" {...register('website')} placeholder="https://..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="IVA (%)" type="number" {...register('iva_rate')} placeholder="19" />
              <Input label="Cuota Admin (%)" type="number" {...register('admin_fee_percent')} placeholder="0" />
            </div>
            <Button type="submit" loading={updateTenant.isPending}>
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modulos y Funciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Permitir citas en el pasado"
            enabled={tenant?.allow_past_appointments ?? false}
            onChange={(val) => {
              if (tenantId) {
                updateTenant.mutate({ id: tenantId, allow_past_appointments: val });
              }
            }}
          />
          <Toggle
            label="Productos para estilistas"
            enabled={false}
            onChange={() => toast.info('Disponible en plan Pro')}
          />
          <Toggle
            label="Cuota administrativa"
            enabled={false}
            onChange={() => toast.info('Disponible en plan Pro')}
          />
          <Toggle
            label="Prestamos al personal"
            enabled={false}
            onChange={() => toast.info('Disponible en plan Pro')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
