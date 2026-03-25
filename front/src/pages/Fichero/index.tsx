import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Col, Row, Badge, Spinner, Button, Input } from 'reactstrap';
import { api } from '../../services/api';
import { getIsPrimaryBranch } from '../../services/auth';
import { useSelector } from 'react-redux';

type QueueStylist = {
  queue_id: string;
  stylist_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: number;
  is_active: boolean;
  is_inside_geofence: boolean;
  last_served_at: string | null;
};

type QueueCategory = {
  category_id: string;
  category_name: string;
  stylists: QueueStylist[];
};

const isStylistAvailableForQueue = (stylist: QueueStylist) =>
  stylist.is_active && stylist.is_inside_geofence;

type Branch = {
  id: string;
  name: string;
  branch_color: string;
};

const FicheroDigital: React.FC = () => {
  const tenantId = useSelector((state: any) => state.Login?.user?.tenant_id);
  const isPrimary = getIsPrimaryBranch();

  const [queues, setQueues] = useState<QueueCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [resetting, setResetting] = useState(false);

  const activeTenantId = selectedBranch || tenantId;

  const fetchBranches = useCallback(async () => {
    if (!isPrimary) return;
    try {
      const { data } = await api.get('/tenants/my-businesses');
      if (Array.isArray(data)) setBranches(data);
    } catch { /* ignore */ }
  }, [isPrimary]);

  const fetchQueues = useCallback(async () => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/fichero/tenant/${activeTenantId}`);
      setQueues(data || []);
    } catch (err) {
      console.error('Error fetching fichero:', err);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const handleReset = async () => {
    if (!activeTenantId) return;
    setResetting(true);
    try {
      await api.post(`/fichero/reset/${activeTenantId}`);
      await fetchQueues();
    } catch (err) {
      console.error('Error resetting queues:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleAssignNext = async (categoryId: string) => {
    try {
      const { data } = await api.post(`/fichero/next/${categoryId}`, {
        tenant_id: activeTenantId
      });
      if (data?.first_name) {
        // Refresh queues after assignment
        await fetchQueues();
      }
    } catch (err) {
      console.error('Error assigning next:', err);
    }
  };

  const getTimeSince = (dateStr: string | null): string => {
    if (!dateStr) return 'Sin atender';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Justo ahora';
    if (diff < 60) return `hace ${diff} min`;
    return `hace ${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h5 className="fw-bold mb-0">
            <i className="ri-list-ordered me-2 text-primary"></i>
            Fichero Digital
          </h5>
          {loading && <Spinner size="sm" color="primary" />}
        </div>

        <div className="d-flex align-items-center gap-2">
          {isPrimary && branches.length > 1 && (
            <Input
              type="select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{ width: 200 }}
            >
              <option value="">Mi sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Input>
          )}
          <Button color="soft-warning" size="sm" onClick={handleReset} disabled={resetting}>
            <i className={`ri-restart-line me-1 ${resetting ? 'spin' : ''}`}></i>
            Resetear colas
          </Button>
          <Button color="soft-success" size="sm" onClick={fetchQueues} disabled={loading}>
            <i className="ri-refresh-line me-1"></i>
            Refrescar
          </Button>
        </div>
      </div>

      {/* Queues */}
      {queues.length === 0 && !loading ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-5">
            <div className="avatar-lg mx-auto mb-3">
              <div className="avatar-title bg-light text-primary rounded-circle display-4">
                <i className="ri-list-ordered"></i>
              </div>
            </div>
            <h5>No hay colas configuradas</h5>
            <p className="text-muted mb-3">
              Presiona "Resetear colas" para generar las colas basadas en los estilistas y servicios asignados.
            </p>
            <Button color="primary" onClick={handleReset} disabled={resetting}>
              <i className="ri-restart-line me-1"></i>
              Generar colas
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Row className="g-3">
          {queues
            .map((q) => ({
              ...q,
              stylists: q.stylists.filter(isStylistAvailableForQueue)
            }))
            .filter((q) => q.stylists.length > 0)
            .map((q) => (
            <Col key={q.category_id} xs={12} md={6} lg={4} xl={3}>
              <Card className="h-100 shadow-sm border">
                <div className="p-3 border-bottom bg-light-subtle d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold text-dark text-truncate" title={q.category_name}>
                    <i className="ri-scissors-cut-line me-1 text-primary"></i>
                    {q.category_name}
                  </h6>
                  <Badge color="soft-primary" pill>{q.stylists.length}</Badge>
                </div>

                <CardBody className="p-0" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  <div className="p-2">
                    {q.stylists.map((s, idx) => {
                      const isNext = idx === 0;
                      const isPresent = isStylistAvailableForQueue(s);

                      return (
                        <div
                          key={s.queue_id}
                          className={`d-flex align-items-center p-2 mb-2 rounded position-relative shadow-sm ${
                            isNext
                              ? 'bg-success bg-opacity-10 border border-success'
                              : 'bg-white border'
                          }`}
                        >
                          <div
                            className={`position-absolute start-0 top-0 bottom-0 ${isNext ? 'bg-warning' : isPresent ? 'bg-success' : 'bg-secondary'}`}
                            style={{ width: isNext ? '4px' : '3px' }}
                          ></div>

                          <div className="flex-shrink-0 me-2 ms-2">
                            <div className="avatar-xs">
                              <span
                                className={`avatar-title rounded-circle fw-bold fs-12 border ${
                                  isNext
                                    ? 'bg-warning text-dark border-warning'
                                    : isPresent
                                    ? 'bg-success-subtle text-success border-success'
                                    : 'bg-light text-muted border-secondary'
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </div>
                          </div>

                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex align-items-center">
                              <h6 className={`fs-13 mb-0 fw-bold text-truncate ${isNext ? 'text-success' : 'text-dark'}`}>
                                {s.first_name} {s.last_name}
                              </h6>
                              {isNext && (
                                <Badge color="warning" className="ms-2 fs-9 px-2">
                                  <i className="ri-star-fill me-1"></i>Siguiente
                                </Badge>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <small className="text-muted fs-11">
                                <i className="ri-history-line me-1"></i>
                                {getTimeSince(s.last_served_at)}
                              </small>
                              <Badge color="success" pill className="fs-9">
                                <i className="ri-map-pin-line me-1"></i>Presente
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>

                <div className="border-top p-2 bg-white">
                  <Button
                    color="primary"
                    size="sm"
                    className="w-100"
                    onClick={() => handleAssignNext(q.category_id)}
                  >
                    <i className="ri-arrow-right-line me-1"></i>
                    Asignar siguiente
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default FicheroDigital;
