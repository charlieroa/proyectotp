import { useState } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { PageSpinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getTenantIdFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { useProducts, useCreateProduct, useDeleteProduct } from '@/api/products';
import { useCategories, useCreateCategory } from '@/api/categories';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  cost: string;
  stock: string;
  sku: string;
  category_id: string;
}

export default function InventoryPage() {
  const tenantId = getTenantIdFromToken();
  const { data: products, isLoading } = useProducts(tenantId);
  const { data: categories = [] } = useCategories(tenantId, 'product');
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const createCategory = useCreateCategory();
  const { register, handleSubmit, reset } = useForm<ProductForm>();

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const onCreateSubmit = async (data: ProductForm) => {
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('description', data.description);
      fd.append('price', data.price);
      fd.append('cost', data.cost);
      fd.append('stock', data.stock);
      fd.append('sku', data.sku);
      fd.append('category_id', data.category_id);
      fd.append('tenant_id', tenantId ?? '');
      await createProduct.mutateAsync(fd);
      toast.success('Producto creado');
      setShowCreate(false);
      reset();
    } catch {
      toast.error('Error al crear producto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este producto?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Producto eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategoryName, tenant_id: tenantId, type: 'product' });
      toast.success('Categoria creada');
      setNewCategoryName('');
      setShowCategoryModal(false);
    } catch {
      toast.error('Error al crear categoria');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">{filtered.length} productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCategoryModal(true)}>
            Nueva Categoria
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-500">{product.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.category?.name ?? '-'}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <Badge variant={product.stock > 5 ? 'success' : product.stock > 0 ? 'warning' : 'danger'}>
                    {product.stock}
                  </Badge>
                </TableCell>
                <TableCell>{product.sku ?? '-'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-500">No hay productos</div>
        )}
      </Card>

      {/* Create product modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Producto" size="lg">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input label="Nombre" {...register('name', { required: true })} />
          <Input label="Descripcion" {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio" type="number" {...register('price', { required: true })} />
            <Input label="Costo" type="number" {...register('cost')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock" type="number" {...register('stock', { required: true })} />
            <Input label="SKU" {...register('sku')} />
          </div>
          <Select
            label="Categoria"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Seleccionar categoria"
            {...register('category_id')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" loading={createProduct.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>

      {/* Create category modal */}
      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Nueva Categoria">
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory} loading={createCategory.isPending}>Crear</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
