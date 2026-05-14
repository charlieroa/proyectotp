import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Badge, Button, Input, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
  Row, Col, Pagination, PaginationItem, PaginationLink, Card, CardBody
} from 'reactstrap';
import Swal from 'sweetalert2';
import { api } from '../../services/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  plan: string;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  user_count: number;
  tokens_this_month: number;
  created_at: string;
}

const PLAN_OPTIONS = ['free', 'pro', 'business', 'enterprise'];
const PAGE_SIZE = 10;

const planBadge = (plan: string) => {
  switch (plan) {
    case 'enterprise': return { color: 'warning', icon: 'ri-global-line' };
    case 'business': return { color: 'info', icon: 'ri-building-2-line' };
    case 'pro': return { color: 'primary', icon: 'ri-rocket-line' };
    default: return { color: 'secondary', icon: 'ri-gift-line' };
  }
};

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'active': return { color: 'success', label: 'Activo' };
    case 'cancel_at_period_end': return { color: 'warning', label: 'Cancela pronto' };
    case 'past_due': return { color: 'danger', label: 'Pago pendiente' };
    case 'canceled': return { color: 'secondary', label: 'Cancelado' };
    case 'expired': return { color: 'dark', label: 'Expirado' };
    default: return { color: 'light', label: '-' };
  }
};

const TenantTable: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editPlan, setEditPlan] = useState('free');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  // Stats
  const stats = useMemo(() => {
    const total = tenants.length;
    const free = tenants.filter(t => !t.plan || t.plan === 'free').length;
    const paid = tenants.filter(t => t.plan && t.plan !== 'free').length;
    const active = tenants.filter(t => t.subscription_status === 'active').length;
    const pastDue = tenants.filter(t => t.subscription_status === 'past_due').length;
    const canceling = tenants.filter(t => t.subscription_status === 'cancel_at_period_end').length;
    return { total, free, paid, active, pastDue, canceling };
  }, [tenants]);

  // Filter
  const filtered = useMemo(() => {
    let result = tenants;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q)
      );
    }
    if (filterPlan !== 'all') {
      if (filterPlan === 'paid') result = result.filter(t => t.plan && t.plan !== 'free');
      else result = result.filter(t => (t.plan || 'free') === filterPlan);
    }
    if (filterStatus !== 'all') {
      result = result.filter(t => t.subscription_status === filterStatus);
    }
    return result;
  }, [tenants, search, filterPlan, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, filterPlan, filterStatus]);

  const openEditModal = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditPlan(tenant.plan || 'free');
    setEditModal(true);
  };

  const handleUpdatePlan = async () => {
    if (!editTenant) return;
    try {
      await api.put(`/super-admin/tenants/${editTenant.id}`, { plan: editPlan });
      setEditModal(false);
      fetchTenants();
      Swal.fire({ icon: 'success', title: 'Plan actualizado', text: `${editTenant.name} ahora tiene el plan ${editPlan.charAt(0).toUpperCase() + editPlan.slice(1)}.`, timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'No se pudo actualizar el plan.', 'error');
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    const result = await Swal.fire({
      title: '¿Eliminar salón?',
      html: `Se eliminará <strong>${tenant.name}</strong> y todos sus datos permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/super-admin/tenants/${tenant.id}`);
        fetchTenants();
        Swal.fire('Eliminado', `${tenant.name} ha sido eliminado.`, 'success');
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el salón.', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
        <p className="text-muted mt-2">Cargando salones...</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats cards */}
      <Row className="g-3 mb-4">
        {[
          { label: 'Total', value: stats.total, icon: 'ri-store-2-line', color: 'primary', filter: 'all' },
          { label: 'Pagados', value: stats.paid, icon: 'ri-vip-crown-line', color: 'success', filter: 'paid' },
          { label: 'Gratis', value: stats.free, icon: 'ri-gift-line', color: 'secondary', filter: 'free' },
          { label: 'Activos', value: stats.active, icon: 'ri-checkbox-circle-line', color: 'success', filter: '_active' },
          { label: 'Pago pendiente', value: stats.pastDue, icon: 'ri-error-warning-line', color: 'danger', filter: '_past_due' },
          { label: 'Cancelando', value: stats.canceling, icon: 'ri-time-line', color: 'warning', filter: '_cancel' },
        ].map((s) => (
          <Col key={s.label} md={4} xl={2}>
            <Card
              className={`border mb-0 ${(filterPlan === s.filter || filterStatus === s.filter.replace('_', '')) ? `border-${s.color} shadow-sm` : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (s.filter.startsWith('_')) {
                  setFilterPlan('all');
                  setFilterStatus(filterStatus === s.filter.replace('_', '') ? 'all' : s.filter.replace('_', ''));
                } else {
                  setFilterStatus('all');
                  setFilterPlan(filterPlan === s.filter ? 'all' : s.filter);
                }
              }}
            >
              <CardBody className="py-2 px-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`${s.icon} fs-20 text-${s.color}`}></i>
                  <div>
                    <div className="fs-18 fw-bold">{s.value}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{s.label}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Search + filters */}
      <Row className="mb-3 g-2 align-items-center">
        <Col md={4}>
          <div className="search-box">
            <Input type="text" placeholder="Buscar por nombre, email, teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <i className="ri-search-line search-icon"></i>
          </div>
        </Col>
        <Col md={2}>
          <Input type="select" value={filterPlan} onChange={(e) => { setFilterPlan(e.target.value); setFilterStatus('all'); }} bsSize="sm">
            <option value="all">Todos los planes</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
            <option value="paid">Todos pagados</option>
          </Input>
        </Col>
        <Col md={2}>
          <Input type="select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); }} bsSize="sm">
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="past_due">Pago pendiente</option>
            <option value="cancel_at_period_end">Cancelando</option>
            <option value="canceled">Cancelado</option>
          </Input>
        </Col>
        <Col md={4} className="text-end">
          <span className="text-muted small">{filtered.length} salón{filtered.length !== 1 ? 'es' : ''}</span>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table className="table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Salón</th>
              <th>Contacto</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Vencimiento</th>
              <th className="text-center">Usuarios</th>
              <th className="text-end">Tokens</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">
                  {search || filterPlan !== 'all' || filterStatus !== 'all' ? 'No se encontraron resultados con estos filtros' : 'No hay salones registrados'}
                </td>
              </tr>
            ) : (
              paged.map((t, idx) => {
                const pb = planBadge(t.plan || 'free');
                const sb = statusBadge(t.subscription_status);
                return (
                  <tr key={t.id}>
                    <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <strong>{t.name}</strong>
                      <br /><small className="text-muted">{t.slug}</small>
                    </td>
                    <td>
                      <small>{t.email || '-'}</small>
                      {t.phone && <><br /><small className="text-muted">{t.phone}</small></>}
                    </td>
                    <td>
                      <Badge color={pb.color} pill className="d-inline-flex align-items-center gap-1">
                        <i className={pb.icon} style={{ fontSize: 11 }}></i>
                        {(t.plan || 'free').charAt(0).toUpperCase() + (t.plan || 'free').slice(1)}
                      </Badge>
                    </td>
                    <td>
                      {t.plan && t.plan !== 'free' ? (
                        <Badge color={sb.color} className="bg-opacity-75" pill>{sb.label}</Badge>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td>
                      {t.current_period_end ? (
                        <small>{new Date(t.current_period_end).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td className="text-center">{t.user_count}</td>
                    <td className="text-end">
                      <strong>{(t.tokens_this_month || 0).toLocaleString('es-CO')}</strong>
                    </td>
                    <td className="text-center">
                      <Button color="soft-primary" size="sm" className="me-1" onClick={() => openEditModal(t)} title="Cambiar plan">
                        <i className="ri-edit-line"></i>
                      </Button>
                      <Button color="soft-danger" size="sm" onClick={() => handleDelete(t)} title="Eliminar">
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </small>
          <Pagination className="mb-0">
            <PaginationItem disabled={currentPage === 1}>
              <PaginationLink previous onClick={() => setCurrentPage(currentPage - 1)} />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) page = i + 1;
              else if (currentPage <= 4) page = i + 1;
              else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
              else page = currentPage - 3 + i;
              return (
                <PaginationItem key={page} active={page === currentPage}>
                  <PaginationLink onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem disabled={currentPage === totalPages}>
              <PaginationLink next onClick={() => setCurrentPage(currentPage + 1)} />
            </PaginationItem>
          </Pagination>
        </div>
      )}

      {/* Edit Plan Modal */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered>
        <ModalHeader toggle={() => setEditModal(false)}>
          <i className="ri-edit-line me-2"></i>Cambiar Plan - {editTenant?.name}
        </ModalHeader>
        <ModalBody>
          {editTenant && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <Row>
                  <Col xs={6}>
                    <small className="text-muted d-block">Plan actual</small>
                    <Badge color={planBadge(editTenant.plan || 'free').color} pill>
                      {(editTenant.plan || 'free').charAt(0).toUpperCase() + (editTenant.plan || 'free').slice(1)}
                    </Badge>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted d-block">Estado Stripe</small>
                    <Badge color={statusBadge(editTenant.subscription_status).color} pill>
                      {statusBadge(editTenant.subscription_status).label}
                    </Badge>
                  </Col>
                </Row>
                {editTenant.current_period_end && (
                  <div className="mt-2">
                    <small className="text-muted">Vence: {new Date(editTenant.current_period_end).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
                  </div>
                )}
                {editTenant.stripe_customer_id && (
                  <div className="mt-1">
                    <small className="text-muted font-monospace" style={{ fontSize: 10 }}>Stripe: {editTenant.stripe_customer_id}</small>
                  </div>
                )}
              </div>
              <label className="form-label fw-semibold">Nuevo Plan</label>
              <Input type="select" value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                    {p === 'pro' ? ' - $29.900 COP' : p === 'business' ? ' - $49.900 COP' : p === 'enterprise' ? ' - $129.900 COP' : ' - Gratis'}
                  </option>
                ))}
              </Input>
              {editPlan === 'free' && editTenant.plan !== 'free' && (
                <div className="alert alert-warning mt-2 mb-0 py-2 small">
                  <i className="ri-error-warning-line me-1"></i>
                  Cambiar a Free cancelará la suscripción de Stripe y limpiará los datos de pago.
                </div>
              )}
              {editPlan !== 'free' && editTenant.plan === 'free' && (
                <div className="alert alert-info mt-2 mb-0 py-2 small">
                  <i className="ri-information-line me-1"></i>
                  Se activará el plan manualmente sin pasar por Stripe (cortesía/prueba).
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setEditModal(false)}>Cancelar</Button>
          <Button color="primary" onClick={handleUpdatePlan} disabled={editPlan === (editTenant?.plan || 'free')}>
            <i className="ri-save-line me-1"></i>Guardar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default TenantTable;
