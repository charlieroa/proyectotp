import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/api/services';
import { useCategories, useCreateCategory } from '@/api/categories';

interface Props {
  tenantId: string | null;
}

interface ServiceForm {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  category_id: string;
}

export function ServicesTab({ tenantId }: Props) {
  const { data: services = [] } = useServices(tenantId);
  const { data: categories = [] } = useCategories(tenantId, 'service');
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const createCategory = useCreateCategory();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { register, handleSubmit, reset } = useForm<ServiceForm>();

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', description: '', price: '', duration_minutes: '30', category_id: '' });
    setShowModal(true);
  };

  const openEdit = (svc: Record<string, unknown>) => {
    setEditingId(String(svc.id));
    reset({
      name: String(svc.name ?? ''),
      description: String(svc.description ?? ''),
      price: String(svc.price ?? ''),
      duration_minutes: String(svc.duration_minutes ?? svc.duration ?? '30'),
      category_id: String(svc.category_id ?? ''),
    });
    setShowModal(true);
  };

  const onSubmit = async (data: ServiceForm) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        duration_minutes: Number(data.duration_minutes),
        category_id: data.category_id || undefined,
        tenant_id: tenantId,
      };

      if (editingId) {
        await updateService.mutateAsync({ id: editingId, ...payload });
        toast.success('Servicio actualizado');
      } else {
        await createService.mutateAsync(payload);
        toast.success('Servicio creado');
      }
      setShowModal(false);
    } catch {
      toast.error('Error al guardar servicio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este servicio?')) return;
    try {
      await deleteService.mutateAsync(id);
      toast.success('Servicio eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategoryName, tenant_id: tenantId, type: 'service' });
      toast.success('Categoria creada');
      setNewCategoryName('');
      setShowCategoryModal(false);
    } catch {
      toast.error('Error al crear categoria');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Servicios ({services.length})</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCategoryModal(true)}>
            + Categoria
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Duracion</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((svc) => (
              <TableRow key={svc.id}>
                <TableCell>
                  <p className="font-medium">{svc.name}</p>
                  {svc.description && <p className="text-xs text-gray-500">{svc.description}</p>}
                </TableCell>
                <TableCell>{svc.category?.name ?? '-'}</TableCell>
                <TableCell>{svc.duration ?? (svc as unknown as Record<string, unknown>).duration_minutes} min</TableCell>
                <TableCell>{formatCurrency(svc.price)}</TableCell>
                <TableCell>
                  <Badge variant={svc.is_active !== false ? 'success' : 'danger'}>
                    {svc.is_active !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(svc as unknown as Record<string, unknown>)}
                      className="rounded p-1 text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(svc.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {services.length === 0 && (
          <div className="py-12 text-center text-gray-500">No hay servicios configurados</div>
        )}
      </Card>

      {/* Service modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Servicio' : 'Nuevo Servicio'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre" {...register('name', { required: true })} />
          <Input label="Descripcion" {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio" type="number" {...register('price', { required: true })} />
            <Input label="Duracion (min)" type="number" {...register('duration_minutes', { required: true })} />
          </div>
          <Select
            label="Categoria"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Sin categoria"
            {...register('category_id')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={createService.isPending || updateService.isPending}>
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category modal */}
      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Nueva Categoria">
        <div className="space-y-4">
          <Input label="Nombre" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory} loading={createCategory.isPending}>Crear</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
