import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Card, CardBody, Row, Col, Table, Badge, Button, Spinner,
    Modal, ModalHeader, ModalBody, ModalFooter, Input, Label
} from 'reactstrap';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import api from '../../services/api';
import { getRoleFromToken } from '../../services/auth';

type CashSession = {
    id: string;
    tenant_id: string;
    status: string;
    opened_at: string;
    closed_at: string | null;
    initial_amount: number;
    final_amount_counted: number | null;
    expected_cash_amount: number | null;
    difference: number | null;
    opened_by_name: string;
    closed_by_name: string | null;
    notes: string | null;
};

type CashMovement = {
    id: string;
    type: string;
    description: string;
    amount: number;
    status: string;
    category: string | null;
    payment_method: string | null;
    created_at: string;
    registered_by_name: string | null;
    related_to_name: string | null;
    edited_by_name: string | null;
    edited_at: string | null;
    edit_reason: string | null;
    original_amount: number | null;
    invoice_ref: string | null;
    invoice_id: string | null;
};

type SessionDetail = {
    session: CashSession;
    movements: CashMovement[];
    summary: {
        total_income: number;
        total_expense: number;
        total_cash_income: number;
        total_cash_expense: number;
        expected_cash: number;
        movement_count: number;
    };
};

type Pagination = { page: number; limit: number; total: number; totalPages: number; };

// Helper: determina si un movimiento está protegido contra edición/eliminación
function isProtected(m: CashMovement): string | null {
    if (m.status === 'deducted') return 'protected_tooltip_deducted';
    if (m.invoice_id) return 'protected_tooltip_invoice';
    if (m.category === 'loan_to_staff') return 'protected_tooltip_loan';
    return null;
}

const MovimientosCaja: React.FC = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const userRole = getRoleFromToken();
    const isOwner = userRole === 2;

    // Views
    const [activeView, setActiveView] = useState<'sessions' | 'detail'>('sessions');

    // Sessions list + pagination
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

    // Detail view
    const [selectedDetail, setSelectedDetail] = useState<SessionDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');

    // Edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
    const [editForm, setEditForm] = useState({ amount: '', description: '', category: '', edit_reason: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Create modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ type: 'income', description: '', amount: '', category: '', payment_method: 'cash' });
    const [savingCreate, setSavingCreate] = useState(false);

    // ========== FETCH SESSIONS ==========
    const fetchSessions = useCallback(async (page = 1) => {
        try {
            setLoadingSessions(true);
            const { data } = await api.get('/cash/history', { params: { page, limit: 10 } });
            if (data.sessions) {
                setSessions(data.sessions);
                setPagination(data.pagination);
            } else {
                // Fallback si el backend devuelve array directo (compatibilidad)
                setSessions(Array.isArray(data) ? data : []);
                setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
        } catch (e) {
            console.error('Error loading sessions:', e);
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // ========== DETAIL ==========
    const openSessionDetail = async (sessionId: string) => {
        try {
            setLoadingDetail(true);
            const { data } = await api.get(`/cash/session/${sessionId}`);
            setSelectedDetail(data);
            setActiveView('detail');
        } catch (e: any) {
            Swal.fire('Error', e?.response?.data?.error || 'No se pudo cargar el detalle.', 'error');
        } finally {
            setLoadingDetail(false);
        }
    };

    const refreshDetail = () => {
        if (selectedDetail) openSessionDetail(selectedDetail.session.id);
    };

    const goBackToSessions = () => {
        setActiveView('sessions');
        setSelectedDetail(null);
        setTypeFilter('all');
    };

    // ========== EDIT ==========
    const openEditModal = (movement: CashMovement) => {
        setEditingMovement(movement);
        setEditForm({
            amount: String(Math.abs(Number(movement.amount))),
            description: movement.description,
            category: movement.category || '',
            edit_reason: ''
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingMovement || !editForm.edit_reason.trim()) {
            Swal.fire('', t('edit_reason') + ' es obligatorio.', 'warning');
            return;
        }
        setSavingEdit(true);
        try {
            await api.put(`/cash/movements/${editingMovement.id}`, {
                amount: parseFloat(editForm.amount),
                description: editForm.description,
                category: editForm.category || null,
                edit_reason: editForm.edit_reason
            });
            Swal.fire({ icon: 'success', title: t('movement_updated'), timer: 1500, showConfirmButton: false });
            setEditModalOpen(false);
            refreshDetail();
        } catch (e: any) {
            Swal.fire('Error', e?.response?.data?.error || 'Error al guardar.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    // ========== DELETE ==========
    const handleDelete = async (movement: CashMovement) => {
        const result = await Swal.fire({
            title: t('confirm_delete_movement'),
            html: `<p>${movement.description}</p><p class="fw-semibold">${formatCurrency(movement.amount)}</p><small class="text-danger">${t('delete_warning_irreversible')}</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f06548',
            cancelButtonColor: '#878a99',
            confirmButtonText: t('delete_movement'),
            cancelButtonText: t('cancel')
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/cash/movements/${movement.id}`);
            Swal.fire({ icon: 'success', title: t('movement_deleted'), timer: 1500, showConfirmButton: false });
            refreshDetail();
        } catch (e: any) {
            Swal.fire('Error', e?.response?.data?.error || 'Error al eliminar.', 'error');
        }
    };

    // ========== CREATE ==========
    const handleCreate = async () => {
        const amount = parseFloat(createForm.amount);
        if (!createForm.description || !amount || amount <= 0) {
            Swal.fire('', 'Completa descripción y monto.', 'warning');
            return;
        }
        setSavingCreate(true);
        try {
            await api.post('/cash/movements', {
                type: createForm.type,
                description: createForm.description,
                amount,
                category: createForm.category || null,
                payment_method: createForm.payment_method
            });
            Swal.fire({ icon: 'success', title: t('movement_created'), timer: 1500, showConfirmButton: false });
            setCreateModalOpen(false);
            setCreateForm({ type: 'income', description: '', amount: '', category: '', payment_method: 'cash' });
            refreshDetail();
        } catch (e: any) {
            Swal.fire('Error', e?.response?.data?.error || 'Error al crear.', 'error');
        } finally {
            setSavingCreate(false);
        }
    };

    // ========== HELPERS ==========
    const filteredMovements = useMemo(() => {
        if (!selectedDetail) return [];
        if (typeFilter === 'all') return selectedDetail.movements;
        return selectedDetail.movements.filter(m => m.type === typeFilter);
    }, [selectedDetail, typeFilter]);

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'income': return <Badge color="success-subtle" className="text-success">{t('income')}</Badge>;
            case 'expense': return <Badge color="danger-subtle" className="text-danger">{t('expense')}</Badge>;
            case 'payroll_advance': return <Badge color="warning-subtle" className="text-warning">{t('payroll_advance')}</Badge>;
            default: return <Badge color="info-subtle" className="text-info">{type}</Badge>;
        }
    };

    const getCategoryLabel = (category: string | null) => {
        if (!category) return '-';
        const labels: Record<string, string> = {
            sale: 'Venta', propina_salon: 'Propina Salón', stylist_advance: t('payroll_advance'),
            vendor_invoice: 'Factura Proveedor', loan_to_staff: 'Préstamo', utility_payment: t('utility_payment')
        };
        return labels[category] || category;
    };

    const formatDate = (d: string | null) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    // ============ SESSIONS LIST VIEW ============
    if (activeView === 'sessions') {
        return (
            <div>
                <Row className="mb-3">
                    <Col>
                        <h5 className="mb-0">
                            <i className="ri-money-dollar-box-line me-2 text-primary"></i>
                            {t('cash_sessions_history')}
                        </h5>
                    </Col>
                </Row>

                {loadingSessions ? (
                    <div className="text-center p-5"><Spinner color="primary" /></div>
                ) : sessions.length === 0 ? (
                    <Card><CardBody className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-1 d-block mb-2"></i>
                        No hay sesiones de caja cerradas.
                    </CardBody></Card>
                ) : (
                    <Card>
                        <CardBody className="p-0">
                            <div className="table-responsive">
                                <Table className="table-hover table-striped align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>{t('session_opened_at')}</th>
                                            <th>{t('session_closed_at')}</th>
                                            <th>{t('manager')}</th>
                                            <th className="text-end">{t('initial_base')}</th>
                                            <th className="text-end">{t('expected_cash_total')}</th>
                                            <th className="text-end">{t('counted_amount')}</th>
                                            <th className="text-end">{t('difference_label')}</th>
                                            <th className="text-center">{t('view_detail')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.map(s => {
                                            const diff = s.difference != null ? Number(s.difference) : null;
                                            return (
                                                <tr key={s.id}>
                                                    <td><small>{formatDate(s.opened_at)}</small></td>
                                                    <td><small>{formatDate(s.closed_at)}</small></td>
                                                    <td>{s.opened_by_name}</td>
                                                    <td className="text-end">{formatCurrency(s.initial_amount)}</td>
                                                    <td className="text-end">{s.expected_cash_amount != null ? formatCurrency(s.expected_cash_amount) : '-'}</td>
                                                    <td className="text-end">{s.final_amount_counted != null ? formatCurrency(s.final_amount_counted) : '-'}</td>
                                                    <td className="text-end">
                                                        {diff != null ? (
                                                            <span className={diff === 0 ? 'text-success' : diff > 0 ? 'text-info' : 'text-danger fw-semibold'}>
                                                                {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="text-center">
                                                        <Button color="soft-primary" size="sm" onClick={() => openSessionDetail(s.id)}>
                                                            <i className="ri-eye-line"></i>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </div>
                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                                    <small className="text-muted">
                                        {t('page_of', { page: pagination.page, total: pagination.totalPages })} &mdash; {pagination.total} sesiones
                                    </small>
                                    <div className="d-flex gap-2">
                                        <Button color="soft-primary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchSessions(pagination.page - 1)}>
                                            <i className="ri-arrow-left-s-line me-1"></i>{t('previous')}
                                        </Button>
                                        <Button color="soft-primary" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchSessions(pagination.page + 1)}>
                                            {t('next')}<i className="ri-arrow-right-s-line ms-1"></i>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>
        );
    }

    // ============ SESSION DETAIL VIEW ============
    if (!selectedDetail) {
        return <div className="text-center p-5"><Spinner color="primary" /></div>;
    }

    const { session: sess, summary } = selectedDetail;

    return (
        <div>
            {/* Header */}
            <Row className="mb-3 align-items-center">
                <Col>
                    <Button color="link" className="p-0 text-muted" onClick={goBackToSessions}>
                        <i className="ri-arrow-left-line me-1"></i> {t('back_to_sessions')}
                    </Button>
                    <h5 className="mt-2 mb-0">
                        <i className="ri-file-list-3-line me-2 text-primary"></i>
                        {t('session_detail')}
                    </h5>
                </Col>
                {isOwner && sess.status === 'OPEN' && (
                    <Col xs="auto">
                        <Button color="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
                            <i className="ri-add-line me-1"></i>{t('create_movement')}
                        </Button>
                    </Col>
                )}
            </Row>

            {/* Summary Cards */}
            <Row className="mb-3">
                <Col md={3}>
                    <Card className="border-start border-primary border-3">
                        <CardBody className="py-3">
                            <p className="text-muted mb-1 small">{t('initial_base')}</p>
                            <h5 className="mb-0">{formatCurrency(sess.initial_amount)}</h5>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-start border-success border-3">
                        <CardBody className="py-3">
                            <p className="text-muted mb-1 small">{t('total_income')}</p>
                            <h5 className="mb-0 text-success">{formatCurrency(summary.total_income)}</h5>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-start border-danger border-3">
                        <CardBody className="py-3">
                            <p className="text-muted mb-1 small">{t('cash_expenses')}</p>
                            <h5 className="mb-0 text-danger">{formatCurrency(summary.total_expense)}</h5>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-start border-info border-3">
                        <CardBody className="py-3">
                            <p className="text-muted mb-1 small">{t('expected_cash_total')}</p>
                            <h5 className="mb-0 text-info">{formatCurrency(summary.expected_cash)}</h5>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Session Info */}
            <Card className="mb-3">
                <CardBody>
                    <Row>
                        <Col md={3}>
                            <small className="text-muted">{t('session_opened_at')}</small><br />
                            <span>{formatDate(sess.opened_at)}</span><br />
                            <small className="text-muted">{sess.opened_by_name}</small>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">{t('session_closed_at')}</small><br />
                            <span>{formatDate(sess.closed_at)}</span><br />
                            <small className="text-muted">{sess.closed_by_name || '-'}</small>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">{t('counted_amount')}</small><br />
                            <span>{sess.final_amount_counted != null ? formatCurrency(sess.final_amount_counted) : '-'}</span>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">{t('difference_label')}</small><br />
                            {sess.difference != null ? (
                                <span className={Number(sess.difference) === 0 ? 'text-success fw-semibold' : Number(sess.difference) > 0 ? 'text-info fw-semibold' : 'text-danger fw-semibold'}>
                                    {Number(sess.difference) > 0 ? '+' : ''}{formatCurrency(sess.difference)}
                                </span>
                            ) : '-'}
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* Movements Table */}
            <Card>
                <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">{t('cash_movements')} ({summary.movement_count})</h6>
                        <Input type="select" style={{ width: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="all">{t('all_types')}</option>
                            <option value="income">{t('income')}</option>
                            <option value="expense">{t('expense')}</option>
                            <option value="payroll_advance">{t('payroll_advance')}</option>
                        </Input>
                    </div>

                    {filteredMovements.length === 0 ? (
                        <p className="text-muted text-center py-4">{t('no_movements')}</p>
                    ) : (
                        <div className="table-responsive">
                            <Table className="table-hover align-middle table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>{t('movement_date')}</th>
                                        <th>{t('movement_type')}</th>
                                        <th>{t('movement_category')}</th>
                                        <th>{t('movement_description')}</th>
                                        <th>{t('payment_method_label')}</th>
                                        <th className="text-end">{t('movement_amount')}</th>
                                        <th>{t('registered_by')}</th>
                                        <th>{t('related_to')}</th>
                                        {isOwner && <th className="text-center" style={{ width: 100 }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMovements.map(m => {
                                        const protection = isProtected(m);
                                        return (
                                            <tr key={m.id} className={m.edited_at ? 'table-warning' : ''}>
                                                <td><small>{formatDate(m.created_at)}</small></td>
                                                <td>{getTypeBadge(m.type)}</td>
                                                <td><small>{getCategoryLabel(m.category)}</small></td>
                                                <td>
                                                    {m.description}
                                                    {m.invoice_ref && <small className="text-muted d-block">Ref: {m.invoice_ref}</small>}
                                                    {protection && (
                                                        <Badge color="secondary-subtle" className="text-secondary ms-1" pill title={t(protection)}>
                                                            <i className="ri-lock-line me-1"></i>{t('protected_movement')}
                                                        </Badge>
                                                    )}
                                                    {m.edited_at && (
                                                        <div className="mt-1">
                                                            <Badge color="warning-subtle" className="text-warning" pill>
                                                                <i className="ri-edit-line me-1"></i>{t('edited_badge')}
                                                            </Badge>
                                                            <small className="text-muted ms-1" title={m.edit_reason || ''}>
                                                                {m.edited_by_name} - {formatDate(m.edited_at)}
                                                            </small>
                                                            {m.original_amount != null && (
                                                                <small className="text-muted d-block">
                                                                    {t('original_amount')}: {formatCurrency(m.original_amount)}
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td><small>{m.payment_method || '-'}</small></td>
                                                <td className={`text-end fw-semibold ${Number(m.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {Number(m.amount) >= 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                </td>
                                                <td><small>{m.registered_by_name || '-'}</small></td>
                                                <td><small>{m.related_to_name || '-'}</small></td>
                                                {isOwner && (
                                                    <td className="text-center">
                                                        {!protection ? (
                                                            <div className="d-flex gap-1 justify-content-center">
                                                                <Button color="soft-warning" size="sm" onClick={() => openEditModal(m)} title={t('edit_movement')}>
                                                                    <i className="ri-pencil-line"></i>
                                                                </Button>
                                                                <Button color="soft-danger" size="sm" onClick={() => handleDelete(m)} title={t('delete_movement')}>
                                                                    <i className="ri-delete-bin-line"></i>
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <i className="ri-lock-line text-muted" title={t(protection)}></i>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} toggle={() => setEditModalOpen(false)} centered>
                <ModalHeader toggle={() => setEditModalOpen(false)}>
                    <i className="ri-pencil-line me-2"></i>{t('edit_movement')}
                </ModalHeader>
                <ModalBody>
                    {editingMovement && (
                        <>
                            <div className="mb-3 p-2 bg-light rounded">
                                <small className="text-muted">{t('movement_type')}: </small>
                                {getTypeBadge(editingMovement.type)}
                                <small className="text-muted ms-3">{t('movement_date')}: </small>
                                <small>{formatDate(editingMovement.created_at)}</small>
                            </div>
                            {editingMovement.original_amount != null && (
                                <div className="alert alert-warning py-2 small">
                                    <i className="ri-information-line me-1"></i>
                                    {t('original_amount')}: <strong>{formatCurrency(editingMovement.original_amount)}</strong>
                                </div>
                            )}
                            <div className="mb-3">
                                <Label>{t('movement_amount')}</Label>
                                <Input type="number" value={editForm.amount} onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))} min="0" step="0.01" />
                            </div>
                            <div className="mb-3">
                                <Label>{t('movement_description')}</Label>
                                <Input type="text" value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
                            </div>
                            <div className="mb-3">
                                <Label>{t('movement_category')}</Label>
                                <Input type="select" value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}>
                                    <option value="">-</option>
                                    <option value="sale">Venta</option>
                                    <option value="propina_salon">Propina Salón</option>
                                    <option value="stylist_advance">{t('payroll_advance')}</option>
                                    <option value="vendor_invoice">Factura Proveedor</option>
                                    <option value="utility_payment">{t('utility_payment')}</option>
                                </Input>
                            </div>
                            <div className="mb-3">
                                <Label className="text-danger">{t('edit_reason')} *</Label>
                                <Input type="textarea" rows={3} value={editForm.edit_reason} onChange={e => setEditForm(prev => ({ ...prev, edit_reason: e.target.value }))} placeholder={t('edit_reason_placeholder')} />
                            </div>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setEditModalOpen(false)}>{t('cancel')}</Button>
                    <Button color="primary" onClick={handleSaveEdit} disabled={savingEdit || !editForm.edit_reason.trim()}>
                        {savingEdit && <Spinner size="sm" className="me-2" />}
                        {t('save_changes')}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Create Modal */}
            <Modal isOpen={createModalOpen} toggle={() => setCreateModalOpen(false)} centered>
                <ModalHeader toggle={() => setCreateModalOpen(false)}>
                    <i className="ri-add-line me-2"></i>{t('create_movement')}
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label>{t('movement_type_select')}</Label>
                        <Input type="select" value={createForm.type} onChange={e => setCreateForm(prev => ({ ...prev, type: e.target.value }))}>
                            <option value="income">{t('income')}</option>
                            <option value="expense">{t('expense')}</option>
                            <option value="payroll_advance">{t('payroll_advance')}</option>
                        </Input>
                    </div>
                    <div className="mb-3">
                        <Label>{t('movement_description')}</Label>
                        <Input type="text" value={createForm.description} onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Descripción del movimiento" />
                    </div>
                    <div className="mb-3">
                        <Label>{t('movement_amount')}</Label>
                        <Input type="number" value={createForm.amount} onChange={e => setCreateForm(prev => ({ ...prev, amount: e.target.value }))} min="0" step="0.01" placeholder="0" />
                    </div>
                    <div className="mb-3">
                        <Label>{t('movement_category')}</Label>
                        <Input type="select" value={createForm.category} onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}>
                            <option value="">-</option>
                            <option value="sale">Venta</option>
                            <option value="stylist_advance">{t('payroll_advance')}</option>
                            <option value="vendor_invoice">Factura Proveedor</option>
                            <option value="utility_payment">{t('utility_payment')}</option>
                        </Input>
                    </div>
                    <div className="mb-3">
                        <Label>{t('payment_method_label')}</Label>
                        <Input type="select" value={createForm.payment_method} onChange={e => setCreateForm(prev => ({ ...prev, payment_method: e.target.value }))}>
                            <option value="cash">Efectivo</option>
                            <option value="credit_card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                        </Input>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setCreateModalOpen(false)}>{t('cancel')}</Button>
                    <Button color="primary" onClick={handleCreate} disabled={savingCreate || !createForm.description || !createForm.amount}>
                        {savingCreate && <Spinner size="sm" className="me-2" />}
                        {t('create_movement')}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default MovimientosCaja;
