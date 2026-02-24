import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { getTenantIdFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { usePayrolls, useGeneratePayroll } from '@/api/payroll';
import { toast } from 'sonner';

export default function PayrollPage() {
  const tenantId = getTenantIdFromToken();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const { data: payrolls, isLoading } = usePayrolls(tenantId, { period });
  const generatePayroll = useGeneratePayroll();

  const handleGenerate = async () => {
    const [year, month] = period.split('-');
    const start = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const end = `${year}-${month}-${lastDay}`;
    try {
      await generatePayroll.mutateAsync({ tenant_id: tenantId, period_start: start, period_end: end });
      toast.success('Nomina generada');
    } catch {
      toast.error('Error al generar nomina');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nomina</h1>
          <p className="text-sm text-gray-500">Gestion de pagos al personal</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button onClick={handleGenerate} loading={generatePayroll.isPending}>
            Generar Nomina
          </Button>
          <Link to="/payroll/preview">
            <Button variant="secondary">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estilista</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Salario Base</TableHead>
              <TableHead>Comisiones</TableHead>
              <TableHead>Deducciones</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payrolls ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.stylist?.name ?? 'Estilista'}</TableCell>
                <TableCell className="text-xs">{p.period_start} - {p.period_end}</TableCell>
                <TableCell>{formatCurrency(p.base_salary)}</TableCell>
                <TableCell className="text-green-600">+{formatCurrency(p.commissions)}</TableCell>
                <TableCell className="text-red-600">-{formatCurrency(p.deductions)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(p.total)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'default'}>
                    {p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(payrolls ?? []).length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <Wallet className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>No hay registros de nomina para este periodo</p>
          </div>
        )}
      </Card>
    </div>
  );
}
