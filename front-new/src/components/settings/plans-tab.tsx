import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Tenant } from '@/types';

interface Props {
  tenant?: Tenant | null;
}

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: 0,
    description: 'Para empezar',
    features: [
      'Calendario basico',
      'Hasta 3 estilistas',
      'Gestion de citas',
      'Dashboard basico',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99000,
    description: 'Para negocios en crecimiento',
    popular: true,
    features: [
      'Todo de Gratis',
      'Estilistas ilimitados',
      'Gestion de inventario',
      'Punto de venta',
      'Nomina y comisiones',
      'Reportes avanzados',
      'Asistente IA',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199000,
    description: 'Para negocios establecidos',
    features: [
      'Todo de Pro',
      'Bot de WhatsApp',
      'Recordatorios automaticos',
      'Soporte prioritario',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399000,
    description: 'Para cadenas y franquicias',
    features: [
      'Todo de Business',
      'Multi-sede',
      'Estilistas compartidos',
      'Geolocalizacion',
      'API personalizada',
      'Soporte dedicado',
    ],
  },
];

export function PlansTab({ tenant }: Props) {
  const currentPlanId = tenant?.plan_id ?? 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold">Elige tu Plan</h3>
        <p className="text-sm text-gray-500">Selecciona el plan que mejor se adapte a tu negocio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => (
          <Card
            key={plan.id}
            className={cn(
              'relative transition-shadow hover:shadow-md',
              plan.popular && 'ring-2 ring-primary-500',
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="primary" className="px-3">Popular</Badge>
              </div>
            )}
            <CardContent className="pt-6">
              <h4 className="text-lg font-bold">{plan.name}</h4>
              <p className="text-xs text-gray-500">{plan.description}</p>
              <div className="my-4">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold">Gratis</p>
                ) : (
                  <p className="text-3xl font-bold">
                    ${plan.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">/mes</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={currentPlanId === i ? 'secondary' : plan.popular ? 'primary' : 'secondary'}
                disabled={currentPlanId === i}
              >
                {currentPlanId === i ? 'Plan Actual' : 'Seleccionar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
