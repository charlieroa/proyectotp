// Archivo: src/Components/Calendar/CentroDeCitasDiarias.tsx

import React, { useCallback, useEffect, useMemo, useState, ChangeEvent } from 'react';
import { Card, CardBody, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter, Button, Nav, NavItem, NavLink, TabContent, TabPane, Label, Spinner, Row, Col, Table, Badge, InputGroup } from "reactstrap";
import classnames from "classnames";
import SimpleBar from "simplebar-react";
import Flatpickr from "react-flatpickr";
import Select from 'react-select';
import { useNavigate } from "react-router-dom";
import TarjetaCita from './TarjetaCita';
import NuevaAtencionModal from './NuevaAtencionModal';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import { jwtDecode } from "jwt-decode";
import { getToken, getRoleFromToken } from "../../services/auth";

// --- Tipos ---
interface CentroDeCitasDiariasProps { events: any[]; onNewAppointmentClick: () => void; targetTenantId?: string; }
type CitaEvento = any;
type GrupoCliente = { clientId: string | number; client_first_name: string; client_last_name?: string; earliestStartISO: string; count: number; appointments: { id: string | number; service_name: string; stylist_first_name?: string; start_time: string; }[]; };
type Stylist = { id: string | number; first_name: string; last_name?: string; };
type ProductForStaff = { id: string; name: string; sale_price: number; staff_price: number; stock: number; };
type CartItem = { productId: string; name: string; quantity: number; price: number; stock: number; };
type SelectOption = { value: string; label: string; };
type ActiveTab = 'anticipo' | 'factura' | 'venta_personal' | 'prestamo' | 'servicios_publicos';

// --- Helpers ---
const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const onlyDigits = (v: string) => (v || '').replace(/\D+/g, '');
const formatCOPString = (digits: string) => {
    if (!digits) return '';
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return '';
    return formatterCOP.format(n);
};

// --- Modales ---
const ModalAbrirCaja: React.FC<{ isOpen: boolean; onClose: () => void; onSessionOpened: () => void; targetTenantId?: string; }> = ({ isOpen, onClose, onSessionOpened, targetTenantId }) => {
    const { t } = useTranslation();
    const [amountDigits, setAmountDigits] = useState('');
    const [saving, setSaving] = useState(false);
    const handleOpenSession = async () => {
        const amount = parseInt(amountDigits || '0', 10) || 0;
        try {
            setSaving(true);
            const payload: any = { initial_amount: amount };
            if (targetTenantId) payload.target_tenant_id = targetTenantId;
            await api.post('/cash/open', payload);
            await Swal.fire(t("cash_opened"), t("cash_started"), 'success');
            onSessionOpened();
            onClose();
        } catch (e: any) {
            Swal.fire(t("error"), e?.response?.data?.error || t("could_not_open_cash"), 'error');
        } finally {
            setSaving(false);
        }
    };
    useEffect(() => { if (!isOpen) setAmountDigits(''); }, [isOpen]);
    return (
        <Modal isOpen={isOpen} toggle={onClose} centered>
            <ModalHeader toggle={onClose}>{t("open_cash")}</ModalHeader>
            <ModalBody>
                <Label>{t("initial_cash")}</Label>
                <Input type="text" inputMode="numeric" placeholder="$0" value={formatCOPString(amountDigits)} onChange={(e) => setAmountDigits(onlyDigits(e.target.value))} autoFocus />
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={onClose}>{t("cancel")}</Button>
                <Button color="primary" onClick={handleOpenSession} disabled={saving}>{saving && <Spinner size="sm" className="me-2" />}{t("confirm_opening")}</Button>
            </ModalFooter>
        </Modal>
    );
};

const ModalResumenCierre: React.FC<{ isOpen: boolean; onClose: () => void; onSessionClosed: () => void; sessionData: any | null; targetTenantId?: string; }> = ({ isOpen, onClose, onSessionClosed, sessionData, targetTenantId }) => {
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const [saving, setSaving] = useState(false);

    const expenseCategoryLabels: Record<string, string> = {
        stylist_advance: t("staff_advances"),
        vendor_invoice: t("vendor_payment"),
        loan_to_staff: t("loan_disbursement"),
        utility_payment: t("utility_payment"),
    };

    const summary = useMemo(() => {
        const details = sessionData?.session_details || {};
        const incomes = sessionData?.summary?.incomes_by_payment_method || [];
        const expenses = sessionData?.summary?.expenses_by_category || [];
        const totalCashIncomes = incomes.find((inc: any) => inc.payment_method === 'cash')?.total || 0;
        const totalExpenses = expenses.reduce((acc: number, exp: any) => acc + Number(exp.total), 0);

        return {
            details, incomes, expenses,
            expectedCash: sessionData?.expected_cash_amount || 0,
            totalCashIncomes, totalExpenses
        };
    }, [sessionData]);

    const handleCloseSession = async () => {
        try {
            setSaving(true);
            const payload: any = {};
            if (targetTenantId) payload.target_tenant_id = targetTenantId;
            await api.post('/cash/close', payload);
            await Swal.fire({ title: t("cash_closed"), text: t("cash_closed_success"), icon: 'success' });
            onSessionClosed();
            onClose();
        } catch (e: any) {
            Swal.fire(t("error"), e?.response?.data?.error || t("could_not_close_cash"), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!sessionData) return null;

    return (
        <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
            <ModalHeader toggle={onClose}>{t("cash_closing_summary")}</ModalHeader>
            <ModalBody>
                <p><strong>{t("manager")}</strong> {summary.details.opener_name}</p>
                <hr />
                <Row className="gy-3">
                    <Col md={6}>
                        <h6><i className="ri-arrow-down-circle-line text-success"></i> {t("total_income")}</h6>
                        <div className="vstack gap-2">
                            {summary.incomes.map((inc: any) => (
                                <div key={inc.payment_method} className="d-flex justify-content-between">
                                    <span>Ingresos por {inc.payment_method} ({inc.count})</span>
                                    <span className="fw-medium">{formatCurrency(inc.total)}</span>
                                </div>
                            ))}
                        </div>
                    </Col>
                    <Col md={6}>
                        <h6><i className="ri-arrow-up-circle-line text-danger"></i> {t("cash_expenses")}</h6>
                        <div className="vstack gap-2">
                            {summary.expenses.length === 0 && <p className="text-muted m-0">{t("no_expenses")}</p>}
                            {summary.expenses.map((exp: any) => (
                                <div key={exp.category} className="d-flex justify-content-between">
                                    <span>{expenseCategoryLabels[exp.category] || exp.category} ({exp.count})</span>
                                    <span className="fw-medium text-danger">-{formatCurrency(exp.total)}</span>
                                </div>
                            ))}
                        </div>
                    </Col>
                </Row>
                <hr />
                <div className="bg-light p-3 rounded">
                    <div className="d-flex justify-content-between"><span className="text-muted">{t("initial_base")}</span><span>{formatCurrency(summary.details.initial_amount)}</span></div>
                    <div className="d-flex justify-content-between mt-2"><span className="text-muted">{t("plus_cash_income")}</span><span className="text-success">{formatCurrency(summary.totalCashIncomes)}</span></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">{t("minus_cash_expenses")}</span><span className="text-danger">-{formatCurrency(summary.totalExpenses)}</span></div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between align-items-center"><strong className="fs-5">{t("expected_cash")}</strong><strong className="fs-3 text-primary">{formatCurrency(summary.expectedCash)}</strong></div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={onClose}>{t("cancel")}</Button>
                <Button color="danger" onClick={handleCloseSession} disabled={saving}>
                    {saving && <Spinner size="sm" className="me-2" />}
                    {t("confirm_close_cash")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};


const CentroDeCitasDiarias = ({ events, onNewAppointmentClick, targetTenantId }: CentroDeCitasDiariasProps) => {
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();
    const userRole = getRoleFromToken();
    const isRecepcionista = false; // Role 6 ahora puede gestionar caja como cajera de sede
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
    const [paymentsModalOpen, setPaymentsModalOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('anticipo');
    const [cashSession, setCashSession] = useState<any | null>(null);
    const [loadingSession, setLoadingSession] = useState<boolean>(true);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [loadingStylists, setLoadingStylists] = useState<boolean>(false);
    const [openModalOpen, setOpenModalOpen] = useState<boolean>(false);
    const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false);
    const [canSellToStaff, setCanSellToStaff] = useState(true);
    const [productsForStaff, setProductsForStaff] = useState<ProductForStaff[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [ventaPersonal, setVentaPersonal] = useState<{ stylist_id: string; cart: CartItem[]; total: number; payment_terms_weeks: number; }>({ stylist_id: '', cart: [], total: 0, payment_terms_weeks: 1 });
    const [paymentEndDate, setPaymentEndDate] = useState<Date | null>(null);
    const [savingVenta, setSavingVenta] = useState(false);
    const [anticipo, setAnticipo] = useState({ stylist_id: '', amountDigits: '', description: '' });
    const [factura, setFactura] = useState({ reference: '', amountDigits: '', description: '' });
    const [servicioPublico, setServicioPublico] = useState({ service_name: '', reference: '', amountDigits: '', description: '' });
    const [canGiveLoans, setCanGiveLoans] = useState(true);
    const [prestamo, setPrestamo] = useState({ stylist_id: '', amountDigits: '', weeks: '4', interest_percent: '5' });
    const [savingPrestamo, setSavingPrestamo] = useState(false);
    const [nuevaAtencionOpen, setNuevaAtencionOpen] = useState(false);

    // --- Estado para modal de movimientos de caja ---
    const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(false);
    const [movTypeFilter, setMovTypeFilter] = useState('all');
    const [editMovModalOpen, setEditMovModalOpen] = useState(false);
    const [editingMov, setEditingMov] = useState<any>(null);
    const [editMovForm, setEditMovForm] = useState({ amount: '', description: '', category: '', edit_reason: '' });
    const [savingMovEdit, setSavingMovEdit] = useState(false);

    const isOwner = userRole === 2;

    const fetchMovements = async () => {
        if (!cashSession?.session_details?.id) return;
        setLoadingMovements(true);
        try {
            const { data } = await api.get(`/cash/session/${cashSession.session_details.id}`);
            setMovements(data.movements || []);
        } catch (e) { console.error(e); }
        finally { setLoadingMovements(false); }
    };

    const isMovProtected = (m: any): string | null => {
        if (m.status === 'deducted') return t('protected_tooltip_deducted');
        if (m.invoice_id) return t('protected_tooltip_invoice');
        if (m.category === 'loan_to_staff') return t('protected_tooltip_loan');
        return null;
    };

    const openEditMov = (m: any) => {
        setEditingMov(m);
        setEditMovForm({ amount: String(Math.abs(Number(m.amount))), description: m.description, category: m.category || '', edit_reason: '' });
        setEditMovModalOpen(true);
    };

    const handleSaveMovEdit = async () => {
        if (!editingMov || !editMovForm.edit_reason.trim()) { Swal.fire('', t('edit_reason') + ' es obligatorio.', 'warning'); return; }
        setSavingMovEdit(true);
        try {
            await api.put(`/cash/movements/${editingMov.id}`, { amount: parseFloat(editMovForm.amount), description: editMovForm.description, category: editMovForm.category || null, edit_reason: editMovForm.edit_reason });
            Swal.fire({ icon: 'success', title: t('movement_updated'), timer: 1500, showConfirmButton: false });
            setEditMovModalOpen(false);
            fetchMovements();
            fetchCurrentSession();
        } catch (e: any) { Swal.fire('Error', e?.response?.data?.error || 'Error al guardar.', 'error'); }
        finally { setSavingMovEdit(false); }
    };

    const handleDeleteMov = async (m: any) => {
        const result = await Swal.fire({ title: t('confirm_delete_movement'), html: `<p>${m.description}</p><p class="fw-semibold">${formatCurrency(m.amount)}</p><small class="text-danger">${t('delete_warning_irreversible')}</small>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#f06548', cancelButtonColor: '#878a99', confirmButtonText: t('delete_movement'), cancelButtonText: t('cancel') });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/cash/movements/${m.id}`);
            Swal.fire({ icon: 'success', title: t('movement_deleted'), timer: 1500, showConfirmButton: false });
            fetchMovements();
            fetchCurrentSession();
        } catch (e: any) { Swal.fire('Error', e?.response?.data?.error || 'Error al eliminar.', 'error'); }
    };

    const filteredMov = useMemo(() => {
        if (movTypeFilter === 'all') return movements;
        return movements.filter(m => m.type === movTypeFilter);
    }, [movements, movTypeFilter]);

    const getMovTypeBadge = (type: string) => {
        switch (type) {
            case 'income': return <Badge color="success-subtle" className="text-success">{t('income')}</Badge>;
            case 'expense': return <Badge color="danger-subtle" className="text-danger">{t('expense')}</Badge>;
            case 'payroll_advance': return <Badge color="warning-subtle" className="text-warning">{t('payroll_advance')}</Badge>;
            default: return <Badge color="info-subtle" className="text-info">{type}</Badge>;
        }
    };

    const getMovCategoryLabel = (cat: string | null) => {
        if (!cat) return '-';
        const labels: Record<string, string> = { sale: 'Venta', propina_salon: 'Propina Salón', stylist_advance: t('payroll_advance'), vendor_invoice: 'Factura Proveedor', loan_to_staff: 'Préstamo', utility_payment: t('utility_payment') };
        return labels[cat] || cat;
    };

    const fmtDate = (d: string | null) => { if (!d) return '-'; return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); };

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    // --- AJUSTE: Se agregó una alerta de error si la carga de la sesión falla ---
    const fetchCurrentSession = useCallback(async (overrideTenantId?: string) => {
        // Recepcionista no gestiona caja — solo ve citas
        if (isRecepcionista) {
            setLoadingSession(false);
            return;
        }
        const tid = overrideTenantId ?? targetTenantId;
        try {
            setLoadingSession(true);
            const params: any = {};
            if (tid) params.target_tenant_id = tid;
            const { data } = await api.get('/cash/current', { params });
            setCashSession(data);
        } catch (e: any) {
            console.error("Error cargando la sesión de caja", e);
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: e?.response?.data?.error || 'No se pudo cargar la información de la sesión de caja. Revisa la consola del servidor backend.',
            });
            setCashSession(null);
        } finally {
            setLoadingSession(false);
        }
    }, [targetTenantId, isRecepcionista]);

    useEffect(() => { fetchCurrentSession(); }, [fetchCurrentSession]);

    const fetchPrerequisites = async () => {
        setLoadingStylists(true); setLoadingProducts(true);
        try {
            const token = getToken(); if (!token) return;
            const decodedToken = jwtDecode<{ user?: { tenant_id?: string } }>(token);
            const tenantId = decodedToken?.user?.tenant_id;
            const stylistsPromise = api.get('/stylists');
            const tenantPromise = tenantId ? api.get(`/tenants/${tenantId}`) : Promise.resolve({ data: { products_for_staff_enabled: true, loans_to_staff_enabled: true } });
            const [stylistsRes, tenantRes] = await Promise.all([stylistsPromise, tenantPromise]);
            setStylists(Array.isArray(stylistsRes.data) ? stylistsRes.data : []);
            const sellToStaffEnabled = tenantRes.data?.products_for_staff_enabled ?? true;
            const giveLoansEnabled = tenantRes.data?.loans_to_staff_enabled ?? true;
            setCanSellToStaff(sellToStaffEnabled);
            setCanGiveLoans(giveLoansEnabled);
            if (sellToStaffEnabled) {
                const productsRes = await api.get('/products?audience=estilista');
                setProductsForStaff(Array.isArray(productsRes.data) ? productsRes.data : []);
            }
        } catch (e) { console.error('Error cargando prerequisitos:', e); }
        finally { setLoadingStylists(false); setLoadingProducts(false); }
    };

    useEffect(() => { if (paymentsModalOpen) fetchPrerequisites(); }, [paymentsModalOpen]);

    const gruposPorCliente = useMemo<GrupoCliente[]>(() => { const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0); const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999); const filtradas: CitaEvento[] = events.filter((event) => { if (event.extendedProps?._isTicket) return false; const fechaCita = new Date(event.start); const enFecha = fechaCita >= startOfDay && fechaCita <= endOfDay; const esOperativa = event.extendedProps.status !== 'cancelled' && event.extendedProps.status !== 'completed'; if (!enFecha || !esOperativa) return false; if (searchTerm) { const q = searchTerm.toLowerCase(); return (event.extendedProps.client_first_name?.toLowerCase().includes(q) || event.extendedProps.client_last_name?.toLowerCase().includes(q) || event.extendedProps.stylist_first_name?.toLowerCase().includes(q)); } return true; }); const map = new Map<string | number, GrupoCliente>(); for (const ev of filtradas) { const ep = ev.extendedProps || {}; const clientId = ep.client_id ?? ep.clientId; if (clientId == null) continue; const item = { id: ev.id, service_name: ep.service_name, stylist_first_name: ep.stylist_first_name, start_time: ep.start_time ?? ev.start, }; if (!map.has(clientId)) { map.set(clientId, { clientId, client_first_name: ep.client_first_name, client_last_name: ep.client_last_name, earliestStartISO: item.start_time, count: 1, appointments: [item], }); } else { const g = map.get(clientId)!; g.appointments.push(item); g.count += 1; if (new Date(item.start_time).getTime() < new Date(g.earliestStartISO).getTime()) { g.earliestStartISO = item.start_time; } } } return Array.from(map.values()).sort((a, b) => new Date(a.earliestStartISO).getTime() - new Date(b.earliestStartISO).getTime()); }, [events, selectedDate, searchTerm, cashSession]);

    // Tickets virtuales del día seleccionado — separados porque no son citas.
    const ticketsDelDia = useMemo(() => {
        const dayISO = selectedDate.toISOString().slice(0, 10);
        return events
            .filter((ev: any) => ev.extendedProps?._isTicket)
            .filter((ev: any) => {
                const created = (ev.extendedProps?.created_at || '').slice(0, 10);
                return created === dayISO;
            })
            .filter((ev: any) => {
                if (!searchTerm) return true;
                const q = searchTerm.toLowerCase();
                return (ev.extendedProps?.client_name || '').toLowerCase().includes(q);
            });
    }, [events, selectedDate, searchTerm]);
    const handleOpenPayments = () => { setActiveTab('anticipo'); setPaymentsModalOpen(true); };
    const handleNewSale = () => { navigate('/checkout'); };
    const handleSaveAnticipo = async () => { const amount = parseInt(anticipo.amountDigits || '0', 10) || 0; if (!anticipo.stylist_id || amount <= 0) { Swal.fire('Datos incompletos', 'Selecciona un estilista y un monto valido.', 'warning'); return; } try { const payload: any = { type: 'payroll_advance', category: 'stylist_advance', description: anticipo.description || 'Anticipo', amount, payment_method: 'cash', related_entity_type: 'stylist', related_entity_id: anticipo.stylist_id }; if (targetTenantId) payload.target_tenant_id = targetTenantId; await api.post('/cash/movements', payload); Swal.fire('¡Éxito!', 'Anticipo registrado correctamente.', 'success'); setPaymentsModalOpen(false); setAnticipo({ stylist_id: '', amountDigits: '', description: '' }); fetchCurrentSession(); } catch (e: any) { console.error(e); Swal.fire('Error', e?.response?.data?.error || 'No se pudo registrar el anticipo.', 'error'); } };
    const handleSaveFactura = async () => { const amount = parseInt(factura.amountDigits || '0', 10) || 0; if (!factura.reference || amount <= 0) { Swal.fire('Datos incompletos', 'Ingresa una referencia y un monto valido.', 'warning'); return; } try { const payload: any = { type: 'expense', category: 'vendor_invoice', invoice_ref: factura.reference, description: factura.description || 'Factura de proveedor', amount, payment_method: 'cash' }; if (targetTenantId) payload.target_tenant_id = targetTenantId; await api.post('/cash/movements', payload); Swal.fire('¡Éxito!', 'Factura registrada correctamente.', 'success'); setPaymentsModalOpen(false); setFactura({ reference: '', amountDigits: '', description: '' }); fetchCurrentSession(); } catch (e: any) { console.error(e); Swal.fire('Error', e?.response?.data?.error || 'No se pudo registrar la factura.', 'error'); } };
    const handleSaveServicioPublico = async () => { const amount = parseInt(servicioPublico.amountDigits || '0', 10) || 0; if (!servicioPublico.service_name || amount <= 0) { Swal.fire('Datos incompletos', 'Ingresa el nombre del servicio y un monto válido.', 'warning'); return; } try { const payload: any = { type: 'expense', category: 'utility_payment', invoice_ref: servicioPublico.reference, description: `${servicioPublico.service_name}${servicioPublico.description ? ' - ' + servicioPublico.description : ''}`, amount, payment_method: 'cash' }; if (targetTenantId) payload.target_tenant_id = targetTenantId; await api.post('/cash/movements', payload); Swal.fire('¡Éxito!', 'Pago de servicio público registrado correctamente.', 'success'); setPaymentsModalOpen(false); setServicioPublico({ service_name: '', reference: '', amountDigits: '', description: '' }); fetchCurrentSession(); } catch (e: any) { console.error(e); Swal.fire('Error', e?.response?.data?.error || 'No se pudo registrar el pago.', 'error'); } };
    const calculateTotal = (cart: CartItem[]) => { return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); };
    const addToCart = (product: ProductForStaff | null) => { if (!product) return; setVentaPersonal(prev => { const existingItem = prev.cart.find(item => item.productId === product.id); if (existingItem) return prev; const priceToUse = product.staff_price ?? product.sale_price; const newItem: CartItem = { productId: product.id, name: product.name, quantity: 1, price: priceToUse, stock: product.stock }; const updatedCart = [...prev.cart, newItem]; return { ...prev, cart: updatedCart, total: calculateTotal(updatedCart) }; }); };
    const handleQuantityChange = (productId: string, newQuantity: number) => { setVentaPersonal(prev => { const updatedCart = prev.cart.map(item => { if (item.productId === productId) { const validatedQty = Math.max(1, Math.min(item.stock, newQuantity || 1)); return { ...item, quantity: validatedQty }; } return item; }); return { ...prev, cart: updatedCart, total: calculateTotal(updatedCart) }; }); };
    const removeFromCart = (productId: string) => { setVentaPersonal(prev => { const updatedCart = prev.cart.filter(item => item.productId !== productId); return { ...prev, cart: updatedCart, total: calculateTotal(updatedCart) }; }); };
    const paymentPlan = useMemo(() => { if (!paymentEndDate || !ventaPersonal.total || ventaPersonal.total === 0) { return { weeks: 1, weeklyAmount: ventaPersonal.total }; } const today = new Date(); today.setHours(0, 0, 0, 0); const endDate = new Date(paymentEndDate); endDate.setHours(23, 59, 59, 999); const diffTime = Math.abs(endDate.getTime() - today.getTime()); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; const weeks = Math.max(1, Math.ceil(diffDays / 7)); const weeklyAmount = ventaPersonal.total / weeks; return { weeks, weeklyAmount }; }, [paymentEndDate, ventaPersonal.total]);
    const handleSaveVentaPersonal = async () => { if (!ventaPersonal.stylist_id || ventaPersonal.cart.length === 0) { Swal.fire('Datos incompletos', 'Debes seleccionar un estilista y añadir al menos un producto.', 'warning'); return; } setSavingVenta(true); try { const payload = { stylist_id: ventaPersonal.stylist_id, payment_terms_weeks: paymentPlan.weeks, items: ventaPersonal.cart.map(item => ({ product_id: item.productId, quantity: item.quantity, price_at_sale: item.price })) }; await api.post('/staff-purchases', payload); Swal.fire('¡Venta Registrada!', 'La compra se ha registrado como un adelanto de nómina.', 'success'); setPaymentsModalOpen(false); setVentaPersonal({ stylist_id: '', cart: [], total: 0, payment_terms_weeks: 1 }); setPaymentEndDate(null); } catch (e: any) { Swal.fire('Error', e?.response?.data?.error || 'No se pudo registrar la venta.', 'error'); } finally { setSavingVenta(false); } };
    const prestamoSummary = useMemo(() => { const principal = parseInt(prestamo.amountDigits || '0', 10); const weeks = parseInt(prestamo.weeks || '0', 10); const interestRate = parseFloat(prestamo.interest_percent || '0'); if (!principal || !weeks || isNaN(interestRate) || interestRate < 0) { return { totalInterest: 0, totalToRepay: 0, weeklyInstallment: 0, isValid: false }; } const totalInterest = principal * (interestRate / 100); const totalToRepay = principal + totalInterest; const weeklyInstallment = totalToRepay / weeks; return { totalInterest, totalToRepay, weeklyInstallment, isValid: true }; }, [prestamo.amountDigits, prestamo.weeks, prestamo.interest_percent]);
    const handleSavePrestamo = async () => { if (!prestamo.stylist_id || !prestamoSummary.isValid) { Swal.fire('Datos incompletos', 'Completa todos los campos del préstamo correctamente.', 'warning'); return; } setSavingPrestamo(true); try { const payload = { stylist_id: prestamo.stylist_id, principal_amount: parseInt(prestamo.amountDigits, 10), weeks: parseInt(prestamo.weeks, 10), interest_percent: parseFloat(prestamo.interest_percent), disburse_from_cash: true, }; await api.post('/staff-loans', payload); Swal.fire('¡Préstamo Registrado!', 'El préstamo ha sido creado y el egreso se registró en caja.', 'success'); setPaymentsModalOpen(false); setPrestamo({ stylist_id: '', amountDigits: '', weeks: '4', interest_percent: '5' }); fetchCurrentSession(); } catch (e: any) { Swal.fire('Error', e?.response?.data?.error || 'No se pudo registrar el préstamo.', 'error'); } finally { setSavingPrestamo(false); } };
    
    return (
        <Card>
            <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">{isRecepcionista ? t("daily_appointments") : t("daily_operations")}</h5>
                    {isRecepcionista ? (
                        <Button color="primary" size="sm" onClick={onNewAppointmentClick}>
                            <i className="mdi mdi-plus me-1"></i> {t("new_appointment")}
                        </Button>
                    ) : (
                        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                            <DropdownToggle color="light" caret>{t("options")}</DropdownToggle>
                            <DropdownMenu end>
                                {!cashSession && <DropdownItem onClick={() => setOpenModalOpen(true)} disabled={loadingSession}><i className="ri-door-open-line me-2"></i> {t("open_cash")}</DropdownItem>}
                                {cashSession && <DropdownItem onClick={() => setCloseModalOpen(true)} disabled={loadingSession}><i className="mdi mdi-door-closed me-2"></i> {t("close_cash")}</DropdownItem>}
                                <DropdownItem onClick={handleNewSale} disabled={loadingSession}><i className="mdi mdi-cart-plus me-2"></i> {t("quick_sale")}</DropdownItem>
                                <DropdownItem onClick={handleOpenPayments} disabled={loadingSession}><i className="mdi mdi-cash me-2"></i> {t("expenses_staff")}</DropdownItem>
                                {cashSession && <DropdownItem onClick={() => { setMovimientosModalOpen(true); fetchMovements(); }}><i className="ri-file-list-3-line me-2 text-info"></i> {t("cash_movements")}</DropdownItem>}
                                <DropdownItem onClick={onNewAppointmentClick}><i className="mdi mdi-plus me-2"></i> {t("create_new_appointment")}</DropdownItem>
                                <DropdownItem divider />
                                <DropdownItem onClick={() => setNuevaAtencionOpen(true)}><i className="ri-flashlight-line me-2 text-primary"></i> {t("new_attention")}</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    )}
                </div>
                {loadingSession ? ( <div className='text-center p-5'><Spinner /></div> ) : (
                    <>
                        <div className="mb-3"><Flatpickr className="form-control" value={selectedDate} onChange={([date]) => setSelectedDate(date as Date)} options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y" }} /></div>
                        <Input type="text" className="form-control" placeholder="Buscar por cliente o estilista..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </>
                )}
            </CardBody>
            <CardBody className="pt-0">
                {loadingSession ? null : (
                    <SimpleBar style={{ maxHeight: "calc(100vh - 450px)" }}>
                        {!cashSession && !isRecepcionista && (
                            <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 px-3 mb-3" role="alert">
                                <span className="me-2"><i className="ri-information-line align-middle me-1"></i>{t("cash_open_optional_hint")}</span>
                                <Button color="success" size="sm" onClick={() => setOpenModalOpen(true)}><i className="ri-door-open-line me-1"></i> {t("open_cash")}</Button>
                            </div>
                        )}
                        {ticketsDelDia.length > 0 && (
                            <div className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <i className="ri-bill-line text-primary me-1"></i>
                                    <span className="fw-semibold text-primary">Tickets virtuales</span>
                                    <Badge color="primary" pill className="ms-2">{ticketsDelDia.length}</Badge>
                                </div>
                                {ticketsDelDia.map((tk: any) => {
                                    const ep = tk.extendedProps || {};
                                    return (
                                        <Card
                                            key={tk.id}
                                            className="mb-2"
                                            style={{ cursor: 'pointer', borderLeft: '4px solid #7c3aed', background: 'rgba(124,58,237,0.04)' }}
                                            onClick={() => navigate('/checkout', { state: { ticketId: ep.ticket_id } })}
                                        >
                                            <CardBody className="py-2 px-3">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="flex-grow-1 me-2">
                                                        <div className="fw-semibold">🎫 {ep.client_name}</div>
                                                        <small className="text-muted">
                                                            {ep.item_count} línea{ep.item_count === 1 ? '' : 's'}
                                                            {' · '}{formatCurrency(ep.total_amount || 0)}
                                                        </small>
                                                    </div>
                                                    <Button size="sm" color="success">
                                                        <i className="ri-money-dollar-circle-line me-1"></i>
                                                        Cobrar
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    );
                                })}
                                <hr className="my-3" />
                            </div>
                        )}
                        {gruposPorCliente.length > 0
                            ? (gruposPorCliente.map((grupo) => (<TarjetaCita key={grupo.clientId} group={grupo} targetTenantId={targetTenantId} />)))
                            : (ticketsDelDia.length === 0 && <p className="text-muted text-center mt-4">No hay citas pendientes para hoy.</p>)
                        }
                    </SimpleBar>
                )}
            </CardBody>
            
            <Modal isOpen={paymentsModalOpen} toggle={() => setPaymentsModalOpen(false)} centered size="lg">
                <ModalHeader toggle={() => setPaymentsModalOpen(false)}>{t("expenses_staff_operations")}</ModalHeader>
                <ModalBody>
                    <Nav tabs>
                        <NavItem><NavLink className={classnames({ active: activeTab === 'anticipo' })} onClick={() => setActiveTab('anticipo')} style={{ cursor: 'pointer' }}>{t("advance")}</NavLink></NavItem>
                        <NavItem><NavLink className={classnames({ active: activeTab === 'factura' })} onClick={() => setActiveTab('factura')} style={{ cursor: 'pointer' }}>{t("invoice")}</NavLink></NavItem>
                        <NavItem><NavLink className={classnames({ active: activeTab === 'servicios_publicos' })} onClick={() => setActiveTab('servicios_publicos')} style={{ cursor: 'pointer' }}>{t("utility_bill")}</NavLink></NavItem>
                        {canGiveLoans && ( <NavItem><NavLink className={classnames({ active: activeTab === 'prestamo' })} onClick={() => setActiveTab('prestamo')} style={{ cursor: 'pointer' }}>{t("loan")}</NavLink></NavItem> )}
                        {canSellToStaff && ( <NavItem><NavLink className={classnames({ active: activeTab === 'venta_personal' })} onClick={() => setActiveTab('venta_personal')} style={{ cursor: 'pointer' }}>{t("staff_sale")}</NavLink></NavItem> )}
                    </Nav>
                    <TabContent activeTab={activeTab} className="pt-3">
                        <TabPane tabId="anticipo">
                            <div className="mb-3">
                                <Label className="form-label">{t("stylist")}</Label>
                                {loadingStylists ? ( <div className="d-flex align-items-center gap-2"><Spinner size="sm" /> <span>{t("loading")}</span></div> ) : (
                                <Input type="select" value={anticipo.stylist_id} onChange={(e) => setAnticipo(a => ({ ...a, stylist_id: e.target.value }))}>
                                    <option value="">{t("select_stylist")}</option>
                                    {stylists.map((s) => ( <option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name || ''}</option> ))}
                                </Input>
                                )}
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">{t("amount")}</Label>
                                <Input type="text" inputMode="numeric" placeholder="$0" value={formatCOPString(anticipo.amountDigits)} onChange={(e: ChangeEvent<HTMLInputElement>) => { const digits = onlyDigits(e.target.value); setAnticipo(a => ({ ...a, amountDigits: digits })); }} />
                                {anticipo.amountDigits && ( <small className="text-muted">{t("value")} {formatCOPString(anticipo.amountDigits)}</small> )}
                            </div>
                            <div className="mb-0">
                                <Label className="form-label">{t("description")}</Label>
                                <Input type="textarea" rows={3} value={anticipo.description} onChange={(e) => setAnticipo(a => ({ ...a, description: e.target.value }))} placeholder="Motivo del anticipo" />
                            </div>
                        </TabPane>
                        <TabPane tabId="factura">
                            <div className="mb-3"><Label className="form-label">{t("invoice_reference")}</Label><Input value={factura.reference} onChange={(e) => setFactura(f => ({ ...f, reference: e.target.value }))} placeholder="FAC-0001" /></div>
                            <div className="mb-3">
                                <Label className="form-label">{t("amount")}</Label>
                                <Input type="text" inputMode="numeric" placeholder="$0" value={formatCOPString(factura.amountDigits)} onChange={(e: ChangeEvent<HTMLInputElement>) => { const digits = onlyDigits(e.target.value); setFactura(f => ({ ...f, amountDigits: digits })); }} />
                                {factura.amountDigits && ( <small className="text-muted">{t("value")} {formatCOPString(factura.amountDigits)}</small> )}
                            </div>
                            <div className="mb-0"><Label className="form-label">{t("description")}</Label><Input type="textarea" rows={3} value={factura.description} onChange={(e) => setFactura(f => ({ ...f, description: e.target.value }))} placeholder="Detalle de la compra" /></div>
                        </TabPane>
                        <TabPane tabId="servicios_publicos">
                            <div className="mb-3">
                                <Label className="form-label">{t("utility_service_name")}</Label>
                                <Input value={servicioPublico.service_name} onChange={(e) => setServicioPublico(s => ({ ...s, service_name: e.target.value }))} placeholder={t("utility_service_placeholder")} />
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">{t("utility_reference")}</Label>
                                <Input value={servicioPublico.reference} onChange={(e) => setServicioPublico(s => ({ ...s, reference: e.target.value }))} placeholder={t("utility_reference_placeholder")} />
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">{t("amount")}</Label>
                                <Input type="text" inputMode="numeric" placeholder="$0" value={formatCOPString(servicioPublico.amountDigits)} onChange={(e: ChangeEvent<HTMLInputElement>) => { const digits = onlyDigits(e.target.value); setServicioPublico(s => ({ ...s, amountDigits: digits })); }} />
                                {servicioPublico.amountDigits && ( <small className="text-muted">{t("value")} {formatCOPString(servicioPublico.amountDigits)}</small> )}
                            </div>
                            <div className="mb-0">
                                <Label className="form-label">{t("description")}</Label>
                                <Input type="textarea" rows={2} value={servicioPublico.description} onChange={(e) => setServicioPublico(s => ({ ...s, description: e.target.value }))} placeholder="Notas adicionales (opcional)" />
                            </div>
                        </TabPane>
                        <TabPane tabId="prestamo">
                            <Row>
                                <Col md={12} className="mb-3">
                                    <Label className="form-label">{t("stylist")}</Label>
                                    {loadingStylists ? ( <div className="d-flex align-items-center gap-2"><Spinner size="sm" /> <span>{t("loading")}</span></div> ) : (
                                        <Input type="select" value={prestamo.stylist_id} onChange={(e) => setPrestamo(p => ({ ...p, stylist_id: e.target.value }))}>
                                            <option value="">{t("select_stylist")}</option>
                                            {stylists.map((s) => ( <option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name || ''}</option> ))}
                                        </Input>
                                    )}
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label className="form-label">Monto del Préstamo</Label>
                                    <Input type="text" inputMode="numeric" placeholder="$50.000" value={formatCOPString(prestamo.amountDigits)} onChange={(e) => setPrestamo(p => ({ ...p, amountDigits: onlyDigits(e.target.value) }))} />
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label className="form-label">Plazo (Semanas)</Label>
                                    <Input type="number" value={prestamo.weeks} onChange={(e) => setPrestamo(p => ({ ...p, weeks: e.target.value }))} min={1} placeholder="Ej: 4"/>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label className="form-label">Interés (%)</Label>
                                    <Input type="number" value={prestamo.interest_percent} onChange={(e) => setPrestamo(p => ({ ...p, interest_percent: e.target.value }))} min={0} max={100} placeholder="Ej: 5"/>
                                </Col>
                            </Row>
                            {prestamoSummary.isValid && (
                                <div className="bg-light p-3 rounded mt-2">
                                    <h6 className="mb-3">Resumen del Préstamo</h6>
                                    <div className="d-flex justify-content-between"><span>Monto Solicitado:</span> <strong>{formatCurrency(parseInt(prestamo.amountDigits))}</strong></div>
                                    <div className="d-flex justify-content-between mt-1"><span>Intereses Totales ({prestamo.interest_percent}%):</span> <span className="text-danger">{formatCurrency(prestamoSummary.totalInterest)}</span></div>
                                    <hr className="my-2"/>
                                    <div className="d-flex justify-content-between"><span>Total a Pagar:</span> <strong>{formatCurrency(prestamoSummary.totalToRepay)}</strong></div>
                                    <div className="d-flex justify-content-between mt-2 fs-5">
                                        <strong>Descuento Semanal:</strong>
                                        <strong className="text-primary">{formatCurrency(prestamoSummary.weeklyInstallment)}</strong>
                                    </div>
                                    <small className="text-muted">Este descuento se aplicará durante {prestamo.weeks} semanas en la nómina del estilista.</small>
                                </div>
                            )}
                        </TabPane>
                        <TabPane tabId="venta_personal">
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Label className="form-label">{t("stylist")}</Label>
                                    {loadingStylists ? <Spinner size="sm" /> : (
                                        <Input type="select" value={ventaPersonal.stylist_id} onChange={(e) => setVentaPersonal(v => ({ ...v, stylist_id: e.target.value, cart: [], total: 0, payment_terms_weeks: 1 }))}>
                                            <option value="">{t("select_stylist")}</option>
                                            {stylists.map((s) => (<option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name || ''}</option>))}
                                        </Input>
                                    )}
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label className="form-label">Añadir Producto</Label>
                                    {loadingProducts ? <Spinner size="sm" /> : (
                                        <Select
                                            options={productsForStaff.map(p => ({ label: `${p.name} (Stock: ${p.stock})`, value: p.id }))}
                                            onChange={(opt: SelectOption | null) => addToCart(productsForStaff.find(p => p.id === opt?.value) || null)}
                                            placeholder="Busca un producto..."
                                            value={null}
                                        />
                                    )}
                                </Col>
                            </Row>
                            {ventaPersonal.cart.length > 0 && (
                                <>
                                    <Label>Carrito de Compra</Label>
                                    <div className="table-responsive">
                                        <Table size="sm" className="table-centered">
                                            <thead><tr><th>Producto</th><th style={{width: "120px"}}>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
                                            <tbody>
                                                {ventaPersonal.cart.map(item => (
                                                    <tr key={item.productId}>
                                                        <td>{item.name} <br/><small className="text-muted">{formatCurrency(item.price)} c/u</small></td>
                                                        <td>
                                                            <InputGroup size="sm">
                                                                <Button outline color="primary" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}>-</Button>
                                                                <Input bsSize="sm" type="number" className="text-center" value={item.quantity} onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value, 10))} min={1} max={item.stock}/>
                                                                <Button outline color="primary" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}>+</Button>
                                                            </InputGroup>
                                                        </td>
                                                        <td className="fw-medium">{formatCurrency(item.price * item.quantity)}</td>
                                                        <td><Button close onClick={() => removeFromCart(item.productId)} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                    <hr/>
                                    <Row className="justify-content-between align-items-center gy-3">
                                        <Col md={6}>
                                            <Label>Fecha final de pago</Label>
                                            <Flatpickr
                                                className="form-control"
                                                value={paymentEndDate || undefined}
                                                onChange={([date]) => setPaymentEndDate(date as Date)}
                                                options={{ minDate: "today", dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y" }}
                                                placeholder="Selecciona una fecha..."
                                            />
                                            {paymentEndDate && (
                                                <div className="mt-2 p-2 bg-light rounded">
                                                    <p className="mb-1"><strong>Plazo:</strong> {paymentPlan.weeks} semana{paymentPlan.weeks > 1 ? 's' : ''}</p>
                                                    <p className="mb-0"><strong>Pago semanal aprox:</strong> {formatCurrency(paymentPlan.weeklyAmount)}</p>
                                                </div>
                                            )}
                                        </Col>
                                        <Col md={6} className="text-md-end">
                                            <h4 className="mb-0">Total: {formatCurrency(ventaPersonal.total)}</h4>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </TabPane>
                    </TabContent>
                </ModalBody>
                <ModalFooter>
                    {activeTab === 'anticipo' && <Button color="primary" onClick={handleSaveAnticipo} disabled={!anticipo.stylist_id || !anticipo.amountDigits}>Guardar Anticipo</Button>}
                    {activeTab === 'factura' && <Button color="primary" onClick={handleSaveFactura} disabled={!factura.reference || !factura.amountDigits}>Guardar Factura</Button>}
                    {activeTab === 'servicios_publicos' && <Button color="primary" onClick={handleSaveServicioPublico} disabled={!servicioPublico.service_name || !servicioPublico.amountDigits}>Guardar Pago</Button>}
                    {activeTab === 'prestamo' && <Button color="primary" onClick={handleSavePrestamo} disabled={savingPrestamo || !prestamoSummary.isValid}>{savingPrestamo && <Spinner size="sm" className="me-2"/>} Guardar Préstamo</Button>}
                    {activeTab === 'venta_personal' && <Button color="primary" onClick={handleSaveVentaPersonal} disabled={savingVenta}>{savingVenta && <Spinner size="sm"/>} Guardar Venta</Button>}
                    <Button color="secondary" onClick={() => setPaymentsModalOpen(false)}>{t("cancel")}</Button>
                </ModalFooter>
            </Modal>
            <ModalAbrirCaja isOpen={openModalOpen} onClose={() => setOpenModalOpen(false)} onSessionOpened={fetchCurrentSession} targetTenantId={targetTenantId} />
            <ModalResumenCierre isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} onSessionClosed={fetchCurrentSession} sessionData={cashSession} targetTenantId={targetTenantId} />
            {/* Modal Movimientos de Caja */}
            <Modal isOpen={movimientosModalOpen} toggle={() => setMovimientosModalOpen(false)} centered size="xl">
                <ModalHeader toggle={() => setMovimientosModalOpen(false)}>
                    <i className="ri-file-list-3-line me-2 text-primary"></i>{t("cash_movements")}
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <small className="text-muted">{movements.length} movimientos</small>
                        <Input type="select" style={{ width: 180 }} bsSize="sm" value={movTypeFilter} onChange={e => setMovTypeFilter(e.target.value)}>
                            <option value="all">{t('all_types')}</option>
                            <option value="income">{t('income')}</option>
                            <option value="expense">{t('expense')}</option>
                            <option value="payroll_advance">{t('payroll_advance')}</option>
                        </Input>
                    </div>
                    {loadingMovements ? <div className="text-center py-4"><Spinner /></div> : filteredMov.length === 0 ? (
                        <p className="text-muted text-center py-4">{t('no_movements')}</p>
                    ) : (
                        <div className="table-responsive" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                            <Table className="table-hover align-middle table-nowrap mb-0" size="sm">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th>{t('movement_date')}</th>
                                        <th>{t('movement_type')}</th>
                                        <th>{t('movement_category')}</th>
                                        <th>{t('movement_description')}</th>
                                        <th>{t('payment_method_label')}</th>
                                        <th className="text-end">{t('movement_amount')}</th>
                                        <th>{t('registered_by')}</th>
                                        {isOwner && <th className="text-center" style={{ width: 90 }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMov.map((m: any) => {
                                        const prot = isMovProtected(m);
                                        return (
                                            <tr key={m.id} className={m.edited_at ? 'table-warning' : ''}>
                                                <td><small>{fmtDate(m.created_at)}</small></td>
                                                <td>{getMovTypeBadge(m.type)}</td>
                                                <td><small>{getMovCategoryLabel(m.category)}</small></td>
                                                <td>
                                                    <span style={{ maxWidth: 220, display: 'inline-block' }} className="text-truncate">{m.description}</span>
                                                    {m.invoice_ref && <small className="text-muted d-block">Ref: {m.invoice_ref}</small>}
                                                    {prot && <Badge color="secondary-subtle" className="text-secondary ms-1" pill><i className="ri-lock-line me-1"></i>{t('protected_movement')}</Badge>}
                                                    {m.edited_at && (
                                                        <div>
                                                            <Badge color="warning-subtle" className="text-warning" pill><i className="ri-edit-line me-1"></i>{t('edited_badge')}</Badge>
                                                            <small className="text-muted ms-1">{m.edited_by_name}</small>
                                                            {m.original_amount != null && <small className="text-muted d-block">{t('original_amount')}: {formatCurrency(m.original_amount)}</small>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td><small>{m.payment_method || '-'}</small></td>
                                                <td className={`text-end fw-semibold ${Number(m.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {Number(m.amount) >= 0 ? '+' : ''}{formatCurrency(m.amount)}
                                                </td>
                                                <td><small>{m.registered_by_name || '-'}</small></td>
                                                {isOwner && (
                                                    <td className="text-center">
                                                        {!prot ? (
                                                            <div className="d-flex gap-1 justify-content-center">
                                                                <Button color="soft-warning" size="sm" onClick={() => openEditMov(m)} title={t('edit_movement')}><i className="ri-pencil-line"></i></Button>
                                                                <Button color="soft-danger" size="sm" onClick={() => handleDeleteMov(m)} title={t('delete_movement')}><i className="ri-delete-bin-line"></i></Button>
                                                            </div>
                                                        ) : <i className="ri-lock-line text-muted"></i>}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setMovimientosModalOpen(false)}>{t("close")}</Button>
                </ModalFooter>
            </Modal>

            {/* Modal Editar Movimiento */}
            <Modal isOpen={editMovModalOpen} toggle={() => setEditMovModalOpen(false)} centered>
                <ModalHeader toggle={() => setEditMovModalOpen(false)}><i className="ri-pencil-line me-2"></i>{t('edit_movement')}</ModalHeader>
                <ModalBody>
                    {editingMov && (
                        <>
                            <div className="mb-3 p-2 bg-light rounded">
                                <small className="text-muted">{t('movement_type')}: </small>{getMovTypeBadge(editingMov.type)}
                                <small className="text-muted ms-3">{t('movement_date')}: </small><small>{fmtDate(editingMov.created_at)}</small>
                            </div>
                            {editingMov.original_amount != null && (
                                <div className="alert alert-warning py-2 small"><i className="ri-information-line me-1"></i>{t('original_amount')}: <strong>{formatCurrency(editingMov.original_amount)}</strong></div>
                            )}
                            <div className="mb-3"><Label>{t('movement_amount')}</Label><Input type="number" value={editMovForm.amount} onChange={e => setEditMovForm(prev => ({ ...prev, amount: e.target.value }))} min="0" step="0.01" /></div>
                            <div className="mb-3"><Label>{t('movement_description')}</Label><Input type="text" value={editMovForm.description} onChange={e => setEditMovForm(prev => ({ ...prev, description: e.target.value }))} /></div>
                            <div className="mb-3">
                                <Label>{t('movement_category')}</Label>
                                <Input type="select" value={editMovForm.category} onChange={e => setEditMovForm(prev => ({ ...prev, category: e.target.value }))}>
                                    <option value="">-</option>
                                    <option value="sale">Venta</option>
                                    <option value="propina_salon">Propina Salón</option>
                                    <option value="stylist_advance">{t('payroll_advance')}</option>
                                    <option value="vendor_invoice">Factura Proveedor</option>
                                    <option value="utility_payment">{t('utility_payment')}</option>
                                </Input>
                            </div>
                            <div className="mb-3"><Label className="text-danger">{t('edit_reason')} *</Label><Input type="textarea" rows={3} value={editMovForm.edit_reason} onChange={e => setEditMovForm(prev => ({ ...prev, edit_reason: e.target.value }))} placeholder={t('edit_reason_placeholder')} /></div>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setEditMovModalOpen(false)}>{t('cancel')}</Button>
                    <Button color="primary" onClick={handleSaveMovEdit} disabled={savingMovEdit || !editMovForm.edit_reason.trim()}>{savingMovEdit && <Spinner size="sm" className="me-2" />}{t('save_changes')}</Button>
                </ModalFooter>
            </Modal>

            <NuevaAtencionModal isOpen={nuevaAtencionOpen} onClose={() => setNuevaAtencionOpen(false)} targetTenantId={targetTenantId} />
        </Card>
    );
};

export default CentroDeCitasDiarias;