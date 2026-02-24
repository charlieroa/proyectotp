import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/api/users';

interface Props {
  tenantId: string | null;
}

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  role_id: string;
  password: string;
  payment_type: string;
  base_salary: string;
  commission_rate: string;
}

export function StaffTab({ tenantId }: Props) {
  const { data: users = [] } = useUsers(tenantId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const staff = users.filter((u) => u.role_id === 2 || u.role_id === 3);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { register, handleSubmit, reset, watch } = useForm<StaffForm>();
  const paymentType = watch('payment_type');

  const filteredStaff = roleFilter === 'all'
    ? staff
    : staff.filter((u) => u.role_id === Number(roleFilter));

  const openCreate = () => {
    setEditingId(null);
    reset({
      name: '', email: '', phone: '', role_id: '3',
      password: '', payment_type: 'commission',
      base_salary: '0', commission_rate: '0',
    });
    setShowModal(true);
  };

  const openEdit = (u: Record<string, unknown>) => {
    setEditingId(String(u.id));
    reset({
      name: String(u.name ?? u.first_name ?? ''),
      email: String(u.email ?? ''),
      phone: String(u.phone ?? ''),
      role_id: String(u.role_id ?? '3'),
      password: '',
      payment_type: String(u.payment_type ?? 'commission'),
      base_salary: String(u.base_salary ?? '0'),
      commission_rate: String(u.commission_rate ?? '0'),
    });
    setShowModal(true);
  };

  const onSubmit = async (data: StaffForm) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role_id: Number(data.role_id),
        tenant_id: tenantId,
        payment_type: data.payment_type,
        base_salary: Number(data.base_salary),
        commission_rate: Number(data.commission_rate),
      };
      if (data.password) payload.password = data.password;

      if (editingId) {
        await updateUser.mutateAsync({ id: editingId, ...payload });
        toast.success('Personal actualizado');
      } else {
        if (!data.password) {
          toast.error('La contrasena es requerida');
          return;
        }
        await createUser.mutateAsync(payload);
        toast.success('Personal creado');
      }
      setShowModal(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este miembro del personal?')) return;
    try {
      await deleteUser.mutateAsync(id);
      toast.success('Eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Personal ({filteredStaff.length})</h3>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'Todos' },
              { value: '3', label: 'Estilistas' },
              { value: '2', label: 'Admin' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  roleFilter === opt.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={u.role_id === 2 ? 'primary' : 'info'}>
                    {u.role_id === 2 ? 'Admin' : 'Estilista'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {(u as unknown as Record<string, unknown>).payment_type === 'salary' ? 'Salario' : 'Comision'}
                </TableCell>
                <TableCell>
                  <Badge variant={u.is_active !== false ? 'success' : 'danger'}>
                    {u.is_active !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u as unknown as Record<string, unknown>)} className="rounded p-1 text-gray-400 hover:text-primary-600">

                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="rounded p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredStaff.length === 0 && (
          <div className="py-12 text-center text-gray-500">No hay personal registrado</div>
        )}
      </Card>

      {/* Staff modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Personal' : 'Nuevo Personal'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" {...register('name', { required: true })} />
            <Input label="Email" type="email" {...register('email', { required: true })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Telefono" {...register('phone')} />
            <Select
              label="Rol"
              options={[
                { value: '3', label: 'Estilista' },
                { value: '2', label: 'Administrador' },
              ]}
              {...register('role_id')}
            />
          </div>
          <Input
            label={editingId ? 'Nueva contrasena (dejar vacio para no cambiar)' : 'Contrasena'}
            type="password"
            {...register('password')}
          />

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Tipo de Pago</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="salary" {...register('payment_type')} className="text-primary-600" />
                Salario Fijo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="commission" {...register('payment_type')} className="text-primary-600" />
                Comision
              </label>
            </div>
            {paymentType === 'salary' ? (
              <Input label="Salario Base" type="number" {...register('base_salary')} />
            ) : (
              <Input label="Tasa de Comision (%)" type="number" {...register('commission_rate')} />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={createUser.isPending || updateUser.isPending}>
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
