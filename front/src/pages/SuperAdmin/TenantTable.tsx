import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Badge, Button, Input, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
  Row, Col, Pagination, PaginationItem, PaginationLink
} from 'reactstrap';
import Swal from 'sweetalert2';
import { api } from '../../services/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  payment_plan: string;
  user_count: number;
  tokens_this_month: number;
  created_at: string;
}

const PLAN_OPTIONS = ['free', 'basic', 'premium', 'enterprise'];
const PAGE_SIZE = 10;

const planBadgeColor = (plan: string) => {
  switch (plan) {
    case 'enterprise': return 'danger';
    case 'premium': return 'warning';
    case 'basic': return 'info';
    default: return 'secondary';
  }
};

const TenantTable: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  useEffect(() => {
    fetchTenants();
  }, []);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q) ||
        t.slug?.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const openEditModal = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditPlan(tenant.payment_plan);
    setEditModal(true);
  };

  const handleUpdatePlan = async () => {
    if (!editTenant) return;
    try {
      await api.put(`/super-admin/tenants/${editTenant.id}`, { payment_plan: editPlan });
      setEditModal(false);
      fetchTenants();
      Swal.fire('Actualizado', 'El plan ha sido actualizado.', 'success');
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
      {/* Search bar and count */}
      <Row className="mb-3 align-items-center">
        <Col md={6}>
          <div className="search-box">
            <Input
              type="text"
              placeholder="Buscar por nombre, email, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
            <i className="ri-search-line search-icon"></i>
          </div>
        </Col>
        <Col md={6} className="text-end">
          <span className="text-muted small">
            {filtered.length} salón{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table className="table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Salón</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Plan</th>
              <th className="text-center">Usuarios</th>
              <th className="text-end">Tokens (mes)</th>
              <th>Creado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">
                  {search ? 'No se encontraron resultados' : 'No hay salones registrados'}
                </td>
              </tr>
            ) : (
              paged.map((t, idx) => (
                <tr key={t.id}>
                  <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <strong>{t.name}</strong>
                    <br />
                    <small className="text-muted">{t.slug}</small>
                  </td>
                  <td><small>{t.email || '-'}</small></td>
                  <td><small>{t.phone || '-'}</small></td>
                  <td>
                    <Badge color={planBadgeColor(t.payment_plan)} pill>
                      {t.payment_plan}
                    </Badge>
                  </td>
                  <td className="text-center">{t.user_count}</td>
                  <td className="text-end">
                    <strong>{(t.tokens_this_month || 0).toLocaleString('es-CO')}</strong>
                  </td>
                  <td>
                    <small>{new Date(t.created_at).toLocaleDateString('es-CO')}</small>
                  </td>
                  <td className="text-center">
                    <Button
                      color="soft-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => openEditModal(t)}
                      title="Editar plan"
                    >
                      <i className="ri-edit-line"></i>
                    </Button>
                    <Button
                      color="soft-danger"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      title="Eliminar"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </small>
          <Pagination className="mb-0">
            <PaginationItem disabled={currentPage === 1}>
              <PaginationLink previous onClick={() => setCurrentPage(currentPage - 1)} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page} active={page === currentPage}>
                <PaginationLink onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem disabled={currentPage === totalPages}>
              <PaginationLink next onClick={() => setCurrentPage(currentPage + 1)} />
            </PaginationItem>
          </Pagination>
        </div>
      )}

      {/* Edit Plan Modal */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered>
        <ModalHeader toggle={() => setEditModal(false)}>
          Editar Plan - {editTenant?.name}
        </ModalHeader>
        <ModalBody>
          <label className="form-label">Plan de Pago</label>
          <Input
            type="select"
            value={editPlan}
            onChange={(e) => setEditPlan(e.target.value)}
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Input>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setEditModal(false)}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleUpdatePlan}>
            Guardar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default TenantTable;
