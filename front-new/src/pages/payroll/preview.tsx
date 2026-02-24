import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { getTenantIdFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { usePayrollPreview } from '@/api/payroll';

export default function PayrollPreviewPage() {
  const tenantId = getTenantIdFromToken();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const { data: preview, isLoading } = usePayrollPreview(tenantId, { start, end });

  return (
    <div className="space-y-6">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Volver a Nomina
      </Link>

      <h1 className="text-2xl font-bold">Preview de Nomina</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Input label="Fecha inicio" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label="Fecha fin" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading && <PageSpinner />}

      {preview && Array.isArray(preview) && preview.map((item: Record<string, unknown>, i: number) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{(item.stylist_name as string) ?? 'Estilista'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Salario Base</p>
                <p className="text-lg font-bold">{formatCurrency(Number(item.base_salary) || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Comisiones</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(Number(item.commissions) || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Deducciones</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(Number(item.deductions) || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold">{formatCurrency(Number(item.total) || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
