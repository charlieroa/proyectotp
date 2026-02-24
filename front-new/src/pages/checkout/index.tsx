import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { getTenantIdFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { useServices } from '@/api/services';
import { useProducts } from '@/api/products';
import { useClients, useStylists } from '@/api/users';
import { useCreatePayment } from '@/api/payments';
import { toast } from 'sonner';

type CartServiceItem = {
  id: string;
  name: string;
  price: number;
  stylist_id: string;
  stylist_name: string;
};

type CartProductItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

const checkoutTabs = [
  { id: 'services', label: 'Servicios' },
  { id: 'products', label: 'Productos' },
];

export default function CheckoutPage() {
  const tenantId = getTenantIdFromToken();
  const { data: services, isLoading: sLoading } = useServices(tenantId);
  const { data: products, isLoading: pLoading } = useProducts(tenantId);
  const { data: clients = [] } = useClients(tenantId);
  const { data: stylistsList = [] } = useStylists(tenantId);
  const createPayment = useCreatePayment();

  const [tab, setTab] = useState('services');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [cartServices, setCartServices] = useState<CartServiceItem[]>([]);
  const [cartProducts, setCartProducts] = useState<CartProductItem[]>([]);
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [useCard, setUseCard] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  // Add service to cart
  const [addServiceId, setAddServiceId] = useState('');
  const [addStylistId, setAddStylistId] = useState('');

  const subtotal = useMemo(() => {
    const servicesTotal = cartServices.reduce((sum, s) => sum + s.price, 0);
    const productsTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return servicesTotal + productsTotal;
  }, [cartServices, cartProducts]);

  const tip = Number(tipAmount) || 0;
  const total = subtotal + tip;

  const addService = () => {
    const svc = (services ?? []).find((s) => s.id === addServiceId);
    const sty = stylistsList.find((s) => s.id === addStylistId);
    if (!svc || !sty) return;
    setCartServices((prev) => [
      ...prev,
      { id: svc.id, name: svc.name, price: svc.price, stylist_id: sty.id, stylist_name: sty.name },
    ]);
    setAddServiceId('');
    setAddStylistId('');
  };

  const addProduct = (product: { id: string; name: string; price: number; stock: number }) => {
    setCartProducts((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: Math.min(p.stock, p.quantity + 1) } : p,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeService = (index: number) => {
    setCartServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProductQty = (id: string, delta: number) => {
    setCartProducts((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: Math.max(0, Math.min(p.stock, p.quantity + delta)) } : p))
        .filter((p) => p.quantity > 0),
    );
  };

  const handlePay = async () => {
    try {
      const items = [
        ...cartServices.map((s) => ({
          type: 'service' as const,
          item_id: s.id,
          name: s.name,
          price: s.price,
          quantity: 1,
          stylist_id: s.stylist_id,
        })),
        ...cartProducts.map((p) => ({
          type: 'product' as const,
          item_id: p.id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })),
      ];

      await createPayment.mutateAsync({
        tenant_id: tenantId,
        client_id: selectedClientId || undefined,
        subtotal,
        tip,
        total,
        payment_method: useCard ? 'split' : 'cash',
        cash_amount: Number(cashAmount) || total,
        card_amount: useCard ? Number(cardAmount) || 0 : 0,
        items,
      });

      toast.success('Pago procesado exitosamente');
      setCartServices([]);
      setCartProducts([]);
      setCashAmount('');
      setCardAmount('');
      setTipAmount('');
      setSelectedClientId('');
      setShowPayModal(false);
    } catch {
      toast.error('Error al procesar pago');
    }
  };

  if (sLoading || pLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Product/Service Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <Select
                label="Cliente"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Seleccionar cliente (opcional)"
              />
            </CardContent>
          </Card>

          <Tabs tabs={checkoutTabs} activeTab={tab} onChange={setTab} />

          {tab === 'services' && (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Servicio"
                    value={addServiceId}
                    onChange={(e) => setAddServiceId(e.target.value)}
                    options={(services ?? []).map((s) => ({
                      value: s.id,
                      label: `${s.name} - ${formatCurrency(s.price)}`,
                    }))}
                    placeholder="Seleccionar servicio"
                  />
                  <Select
                    label="Estilista"
                    value={addStylistId}
                    onChange={(e) => setAddStylistId(e.target.value)}
                    options={stylistsList.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Seleccionar estilista"
                  />
                </div>
                <Button onClick={addService} disabled={!addServiceId || !addStylistId} size="sm">
                  <Plus className="h-4 w-4" />
                  Agregar Servicio
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === 'products' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(products ?? []).filter((p) => p.stock > 0).map((product) => (
                <Card key={product.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => addProduct(product)}>
                  <CardContent className="py-4">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-primary-600">{formatCurrency(product.price)}</p>
                    <Badge variant={product.stock > 5 ? 'success' : 'warning'} className="mt-1">
                      Stock: {product.stock}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartServices.length === 0 && cartProducts.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">Carrito vacio</p>
              )}

              {cartServices.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.stylist_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(item.price)}</span>
                    <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {cartProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateProductQty(item.id, -1)} className="rounded bg-gray-100 p-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button onClick={() => updateProductQty(item.id, 1)} className="rounded bg-gray-100 p-1">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Propina</span>
                    <span>{formatCurrency(tip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={cartServices.length === 0 && cartProducts.length === 0}
                onClick={() => setShowPayModal(true)}
              >
                Cobrar {formatCurrency(total)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Procesar Pago">
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">Total a cobrar</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>

          <Input
            label="Propina"
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="0"
          />

          <div>
            <div className="mb-2 flex items-center gap-4">
              <button
                onClick={() => setUseCard(false)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${!useCard ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}
              >
                <Banknote className="h-4 w-4" />
                Solo Efectivo
              </button>
              <button
                onClick={() => setUseCard(true)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${useCard ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}
              >
                <CreditCard className="h-4 w-4" />
                Dividir Pago
              </button>
            </div>

            {!useCard ? (
              <Input
                label="Monto en efectivo"
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder={String(total)}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Efectivo"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
                <Input
                  label="Tarjeta"
                  type="number"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button className="w-full" size="lg" onClick={handlePay} loading={createPayment.isPending}>
            Confirmar Pago
          </Button>
        </div>
      </Modal>
    </div>
  );
}
