import React, { useState, useEffect } from 'react';
import {
  Row, Col, Table, Input, Spinner, Badge, Card, CardBody
} from 'reactstrap';
import { api } from '../../services/api';

interface UsageRow {
  tenant_id: string;
  tenant_name: string;
  call_type: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  call_count: number;
}

const callTypeBadge = (type: string) => {
  switch (type) {
    case 'chat': return 'primary';
    case 'whisper': return 'info';
    case 'tts': return 'warning';
    default: return 'secondary';
  }
};

const TokenUsage: React.FC = () => {
  const [data, setData] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/token-usage', {
        params: { from: dateFrom, to: dateTo + 'T23:59:59' },
      });
      setData(res.data);
    } catch (err) {
      console.error('Error loading token usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [dateFrom, dateTo]);

  // Aggregate totals per tenant
  const tenantTotals: Record<string, { name: string; total: number; calls: number }> = {};
  for (const row of data) {
    const key = row.tenant_id || 'unknown';
    if (!tenantTotals[key]) {
      tenantTotals[key] = { name: row.tenant_name || 'Desconocido', total: 0, calls: 0 };
    }
    tenantTotals[key].total += row.total_tokens;
    tenantTotals[key].calls += row.call_count;
  }

  const sortedTenants = Object.entries(tenantTotals).sort((a, b) => b[1].total - a[1].total);
  const grandTotal = sortedTenants.reduce((acc, [, v]) => acc + v.total, 0);

  return (
    <>
      {/* Date Filters */}
      <Row className="mb-3">
        <Col md={3}>
          <label className="form-label small text-muted">Desde</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <label className="form-label small text-muted">Hasta</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <div className="bg-light rounded-3 px-3 py-2">
            <small className="text-muted">Total del periodo: </small>
            <strong>{grandTotal.toLocaleString('es-CO')} tokens</strong>
          </div>
        </Col>
      </Row>

      {/* Per-Tenant Summary */}
      {sortedTenants.length > 0 && (
        <Row className="mb-4 g-3">
          {sortedTenants.slice(0, 6).map(([id, info]) => (
            <Col md={4} key={id}>
              <Card className="border shadow-sm h-100">
                <CardBody className="py-3">
                  <h6 className="mb-1">{info.name}</h6>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">{info.calls} llamadas</span>
                    <strong>{info.total.toLocaleString('es-CO')} tokens</strong>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Detailed Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-2">Cargando consumo...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <Table className="table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Salón</th>
                <th>Tipo</th>
                <th>Modelo</th>
                <th className="text-end">Prompt</th>
                <th className="text-end">Completion</th>
                <th className="text-end">Total</th>
                <th className="text-end">Llamadas</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No hay datos de consumo en el periodo seleccionado
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.tenant_name || 'Desconocido'}</td>
                    <td>
                      <Badge color={callTypeBadge(row.call_type)} pill>
                        {row.call_type}
                      </Badge>
                    </td>
                    <td>
                      <code className="small">{row.model}</code>
                    </td>
                    <td className="text-end">{row.prompt_tokens.toLocaleString('es-CO')}</td>
                    <td className="text-end">{row.completion_tokens.toLocaleString('es-CO')}</td>
                    <td className="text-end">
                      <strong>{row.total_tokens.toLocaleString('es-CO')}</strong>
                    </td>
                    <td className="text-end">{row.call_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
};

export default TokenUsage;
