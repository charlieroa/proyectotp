import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CountUp from 'react-countup';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import { api } from '../../services/api';
import { Spinner, Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, FormGroup, Row, Col } from 'reactstrap';
import Swal from 'sweetalert2';
import Flatpickr from 'react-flatpickr';

// --- INTERFACES Y TIPOS ---
interface WidgetData { label: string; icon: string; counter: number; prefix?: string; badge: string; separator?: string; duration?: number; }
interface Client { client_name: string; service_name: string; service_price: number; net_commission: number; admin_fee: number; }
interface InventoryItem { product_name: string; commission_value: number; }
interface Expense { description: string; amount: number; }
interface Stylist { id: string; name: string; avatar: string; netToPay: number; stylistTips: number; clients: Client[]; inventory: InventoryItem[]; expenses: Expense[]; hasAdjustments?: boolean; }
interface ApiSummaryWidgets { cash: number; creditCard: number; inventorySold: number; stylistExpenses: number; }
interface ApiStylistDetail { stylist_id: string; stylist_name: string; net_paid: number; stylist_tips?: number; details: { services: Client[]; products: InventoryItem[]; expenses: Expense[]; } }

// --- FORMATEADOR Y COMPONENTES ---
const BreadCrumb = ({ title, pageTitle, onBack, backLabel }: { title: string, pageTitle: string, onBack?: () => void, backLabel?: string }) => (
    <div className="mb-4 d-flex align-items-center">
        {onBack && ( <button onClick={onBack} className="btn btn-light me-3" style={{ border: '1px solid #dee2e6' }}><i className="ri-arrow-left-line"></i> {backLabel || "Back"}</button> )}
        <div><h4>{title}</h4><p className="text-muted mb-0">{pageTitle}</p></div>
    </div>
);

const PayrollWidgets = ({ summary }: { summary: ApiSummaryWidgets }) => {
    const { t } = useTranslation();
    const widgetsData: WidgetData[] = [
        { label: t("total_cash"), icon: "ri-cash-line", counter: summary.cash, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: "." },
        { label: t("total_cards"), icon: "ri-bank-card-line", counter: summary.creditCard, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: "." },
        { label: t("inventory_sold"), icon: "ri-shopping-bag-line", counter: summary.inventorySold, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: "." },
        { label: t("stylist_expenses"), icon: "ri-arrow-up-down-line", counter: Math.abs(summary.stylistExpenses), prefix: "$", badge: "ri-arrow-down-s-line text-danger", separator: "." },
    ];
    return (
        <div className="card crm-widget">
            <div className="card-body p-0"><div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 g-0">
                {widgetsData.map((widget, index) => (
                    <div className="col" key={index}><div className="py-4 px-3">
                        <h5 className="text-muted text-uppercase fs-13">{widget.label}<i className={widget.badge + " fs-18 float-end align-middle"}></i></h5>
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0"><i className={widget.icon + " fs-2 text-muted"}></i></div>
                            <div className="flex-grow-1 ms-3"><h2 className="mb-0"><span className="counter-value"><CountUp start={0} prefix={widget.prefix} separator={widget.separator} end={widget.counter || 0} duration={2} decimals={0}/></span></h2></div>
                        </div></div></div>
                ))}
            </div></div></div>
    );
};

const TabPagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) {
        return null;
    }
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
        <nav className="mt-2">
            <ul className="pagination pagination-sm justify-content-end mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <a className="page-link" href="#!" onClick={(e) => { e.preventDefault(); onPageChange(currentPage - 1); }}>‹</a>
                </li>
                {pageNumbers.map(number => (
                    <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <a onClick={(e) => { e.preventDefault(); onPageChange(number); }} href="#!" className="page-link">{number}</a>
                    </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <a className="page-link" href="#!" onClick={(e) => { e.preventDefault(); onPageChange(currentPage + 1); }}>›</a>
                </li>
            </ul>
        </nav>
    );
};

// --- VISTA DE VISTA PREVIA ---
const PayrollPreview = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [periodAlreadySaved, setPeriodAlreadySaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allStylistsData, setAllStylistsData] = useState<Stylist[]>([]);
    const [periodSummary, setPeriodSummary] = useState<ApiSummaryWidgets | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
    const [activeTab, setActiveTab] = useState('clients');
    const [servicesPage, setServicesPage] = useState(1);
    const [productsPage, setProductsPage] = useState(1);
    const [expensesPage, setExpensesPage] = useState(1);
    
    // --- ESTADO PARA EDICIÓN DE ITEMS ---
    const [editModal, setEditModal] = useState(false);
    const [editType, setEditType] = useState<'service' | 'product' | 'expense' | null>(null);
    const [editIndex, setEditIndex] = useState<number>(-1);
    const [editValues, setEditValues] = useState<Record<string, number>>({});
    const [transferMode, setTransferMode] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState<string>('');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Estado local para fechas editables
    const [startDate, setStartDate] = useState(startDateParam || '');
    const [endDate, setEndDate] = useState(endDateParam || '');
    const [fetchTrigger, setFetchTrigger] = useState(0);

    const handleDateChange = () => {
        if (startDate && endDate) {
            setFetchTrigger(prev => prev + 1);
        }
    };

    // Recalcular netToPay de un estilista basado en sus items actuales
    const recalcNetToPay = useCallback((stylist: Stylist): number => {
        const serviceCommissions = stylist.clients.reduce((sum, c) => sum + c.net_commission, 0);
        const productCommissions = stylist.inventory.reduce((sum, p) => sum + Number(p.commission_value), 0);
        const expensesTotal = stylist.expenses.reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
        const gross = serviceCommissions + productCommissions + stylist.stylistTips;
        const net = gross - expensesTotal;
        return net < 8000 ? 0 : net;
    }, []);

    // Actualizar un estilista en el estado global
    const updateStylistData = useCallback((updatedStylist: Stylist) => {
        const recalculated = { ...updatedStylist, netToPay: recalcNetToPay(updatedStylist), hasAdjustments: true };
        setAllStylistsData(prev => prev.map(s => s.id === recalculated.id ? recalculated : s));
        setSelectedStylist(recalculated);
    }, [recalcNetToPay]);

    // --- HANDLERS DE EDICIÓN ---
    const handleDeleteItem = (type: 'service' | 'product' | 'expense', index: number) => {
        if (!selectedStylist) return;
        const updated = { ...selectedStylist };
        if (type === 'service') {
            updated.clients = [...updated.clients];
            updated.clients.splice(index, 1);
        } else if (type === 'product') {
            updated.inventory = [...updated.inventory];
            updated.inventory.splice(index, 1);
        } else {
            updated.expenses = [...updated.expenses];
            updated.expenses.splice(index, 1);
        }
        updateStylistData(updated);
    };

    const handleOpenEdit = (type: 'service' | 'product' | 'expense', index: number) => {
        if (!selectedStylist) return;
        setEditType(type);
        setEditIndex(index);
        setTransferMode(false);
        setTransferTargetId('');
        if (type === 'service') {
            const item = selectedStylist.clients[index];
            setEditValues({ service_price: Math.round(item.service_price), net_commission: Math.round(item.net_commission) });
        } else if (type === 'product') {
            const item = selectedStylist.inventory[index];
            setEditValues({ commission_value: Math.round(Number(item.commission_value)) });
        } else {
            const item = selectedStylist.expenses[index];
            setEditValues({ amount: Math.round(Math.abs(Number(item.amount))) });
        }
        setEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedStylist || editIndex < 0 || !editType) return;

        // --- TRANSFER MODE ---
        if (transferMode && editType === 'service' && transferTargetId) {
            const targetStylist = allStylistsData.find(s => s.id === transferTargetId);
            if (!targetStylist) return;
            const serviceItem = selectedStylist.clients[editIndex];
            const confirm = await Swal.fire({
                title: t("confirm_transfer") || "Confirmar traslado",
                html: `<p>${t("transfer_confirm_msg") || "¿Está seguro de trasladar este servicio?"}</p>
                       <b>${serviceItem.service_name}</b> - ${formatCurrency(serviceItem.service_price)}<br/>
                       <small>${serviceItem.client_name}</small><br/><br/>
                       <b>${selectedStylist.name}</b> → <b>${targetStylist.name}</b>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t("yes_transfer") || "Sí, trasladar",
                cancelButtonText: t("cancel")
            });
            if (!confirm.isConfirmed) return;

            // Remove from current stylist
            const updatedSource = { ...selectedStylist, clients: [...selectedStylist.clients] };
            updatedSource.clients.splice(editIndex, 1);
            const recalcSource = { ...updatedSource, netToPay: recalcNetToPay(updatedSource), hasAdjustments: true };

            // Add to target stylist
            const updatedTarget = { ...targetStylist, clients: [...targetStylist.clients, serviceItem] };
            const recalcTarget = { ...updatedTarget, netToPay: recalcNetToPay(updatedTarget), hasAdjustments: true };

            setAllStylistsData(prev => prev.map(s => {
                if (s.id === recalcSource.id) return recalcSource;
                if (s.id === recalcTarget.id) return recalcTarget;
                return s;
            }));
            setSelectedStylist(recalcSource);
            setEditModal(false);

            Swal.fire({
                title: t("transferred") || "Trasladado",
                text: `${serviceItem.service_name} → ${targetStylist.name}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }

        // --- NORMAL EDIT ---
        const updated = { ...selectedStylist };
        if (editType === 'service') {
            updated.clients = [...updated.clients];
            updated.clients[editIndex] = {
                ...updated.clients[editIndex],
                service_price: Math.round(editValues.service_price || 0),
                net_commission: Math.round(editValues.net_commission || 0),
            };
        } else if (editType === 'product') {
            updated.inventory = [...updated.inventory];
            updated.inventory[editIndex] = {
                ...updated.inventory[editIndex],
                commission_value: Math.round(editValues.commission_value || 0),
            };
        } else {
            updated.expenses = [...updated.expenses];
            updated.expenses[editIndex] = {
                ...updated.expenses[editIndex],
                amount: Math.round(editValues.amount || 0),
            };
        }
        updateStylistData(updated);
        setEditModal(false);
    };

    useEffect(() => {
        if (!startDate || !endDate) {
            Swal.fire(t("error"), t("no_date_range"), 'error').then(() => navigate('/payroll'));
            return;
        }

        const fetchDetailedPreviewData = async () => {
            try {
                setLoading(true);
                setError(null);
                setSelectedStylist(null);
                const response = await api.get<{ summary_widgets: ApiSummaryWidgets, stylist_breakdowns: ApiStylistDetail[] }>(`/payrolls/detailed-preview?start_date=${startDate}&end_date=${endDate}`);
                const { summary_widgets, stylist_breakdowns } = response.data;

                const formattedStylists: Stylist[] = stylist_breakdowns.map(s => {
                    const nameParts = s.stylist_name.split(' ');
                    const initials = `${nameParts[0][0]}${nameParts.length > 1 ? nameParts[1][0] : ''}`.toUpperCase();
                    return {
                        id: s.stylist_id,
                        name: s.stylist_name,
                        netToPay: s.net_paid,
                        stylistTips: s.stylist_tips || 0,
                        avatar: `https://placehold.co/100x100/EFEFEF/333333?text=${initials}`,
                        clients: s.details.services,
                        inventory: s.details.products,
                        expenses: s.details.expenses,
                    };
                });

                setPeriodSummary(summary_widgets);
                setAllStylistsData(formattedStylists);

                if (formattedStylists.length > 0) {
                    setSelectedStylist(formattedStylists[0]);
                }

                // Verificar si este periodo ya tiene nóminas guardadas
                try {
                    const historyRes = await api.get<any[]>('/payrolls');
                    const exists = historyRes.data.some((p: any) =>
                        p.start_date?.split('T')[0] === startDate && p.end_date?.split('T')[0] === endDate
                    );
                    setPeriodAlreadySaved(exists);
                } catch { /* ignore */ }
            } catch (err: any) {
                const errorMsg = err.response?.data?.error || t("error_loading_payroll");
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchDetailedPreviewData();
    }, [startDate, endDate, fetchTrigger, navigate]);

    const handleGenerateAndSave = async () => {
        if (!startDate || !endDate || allStylistsData.length === 0) return;
        const result = await Swal.fire({
            title: t("confirm_payroll"),
            text: `${t("payroll_save_warning", { count: allStylistsData.length })}`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
            confirmButtonText: t("yes_generate_save"), cancelButtonText: t("cancel")
        });

        if (result.isConfirmed) {
            setIsSaving(true);
            try {
                const savePromises = allStylistsData.map(stylist => api.post('/payrolls', {
                    stylist_id: stylist.id,
                    start_date: startDate,
                    end_date: endDate,
                    ...(stylist.hasAdjustments ? { net_paid_override: stylist.netToPay } : {})
                }));
                await Promise.all(savePromises);
                await Swal.fire(t("saved"), t("payroll_generated"), 'success');
                navigate('/payroll');
            } catch (err) {
                console.error("Error saving payroll:", err);
                Swal.fire(t("error"), t("error_saving_payroll"), 'error');
            } finally { setIsSaving(false); }
        }
    };

    const handleBack = () => navigate('/payroll');
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [displayCount, setDisplayCount] = useState(6);
    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;
            if (isAtBottom && displayCount < allStylistsData.length) {
                const newCount = Math.min(displayCount + 4, allStylistsData.length);
                setDisplayCount(newCount);
            }
        }
    };
    const visibleStylists = allStylistsData.slice(0, displayCount);

    const ITEMS_PER_PAGE = 5;

    // Paginación para Servicios
    const totalServicePages = selectedStylist ? Math.ceil(selectedStylist.clients.length / ITEMS_PER_PAGE) : 0;
    const currentServices = selectedStylist?.clients.slice((servicesPage - 1) * ITEMS_PER_PAGE, servicesPage * ITEMS_PER_PAGE) || [];
    
    // Paginación para Productos
    const totalProductPages = selectedStylist ? Math.ceil(selectedStylist.inventory.length / ITEMS_PER_PAGE) : 0;
    const currentProducts = selectedStylist?.inventory.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE) || [];

    // Paginación para Egresos
    const totalExpensePages = selectedStylist ? Math.ceil(selectedStylist.expenses.length / ITEMS_PER_PAGE) : 0;
    const currentExpenses = selectedStylist?.expenses.slice((expensesPage - 1) * ITEMS_PER_PAGE, expensesPage * ITEMS_PER_PAGE) || [];

    const totalPayroll = allStylistsData.reduce((sum, stylist) => sum + stylist.netToPay, 0);
    const periodTitle = startDate && endDate ? `${t("period_from")} ${startDate} ${t("period_to")} ${endDate}` : t("period_detail");

    if (loading) { return <div className="page-content text-center"><Spinner style={{ width: '3rem', height: '3rem' }} /><h4>{t("calculating_payroll")}</h4></div>; }
    if (error) { return <div className="page-content text-center"><div className="alert alert-danger">{error}</div></div>; }

    return (
        <div className="page-content" style={{ padding: '20px', backgroundColor: '#f5f7fa' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <BreadCrumb title={t("payroll_preview")} pageTitle={periodTitle} onBack={handleBack} backLabel={t("back_to_list")} />
                <div className="card mb-3">
                    <div className="card-body py-3">
                        <Row className="align-items-end g-3">
                            <Col md={4}>
                                <Label className="form-label mb-1">{t("start_date")}</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={startDate}
                                    options={{ dateFormat: "Y-m-d" }}
                                    onChange={([date]: Date[]) => { if (date) setStartDate(date.toISOString().split('T')[0]); }}
                                />
                            </Col>
                            <Col md={4}>
                                <Label className="form-label mb-1">{t("end_date")}</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={endDate}
                                    options={{ dateFormat: "Y-m-d" }}
                                    onChange={([date]: Date[]) => { if (date) setEndDate(date.toISOString().split('T')[0]); }}
                                />
                            </Col>
                            <Col md={4}>
                                <button className="btn btn-primary w-100" onClick={handleDateChange} disabled={loading}>
                                    {loading ? <Spinner size="sm" className="me-1"/> : <i className="ri-refresh-line me-1"></i>}
                                    {t("refresh_data") || "Actualizar datos"}
                                </button>
                            </Col>
                        </Row>
                    </div>
                </div>
                {periodSummary && <PayrollWidgets summary={periodSummary} />}
                <div className="card mt-4">
                    <div className="card-body"><div className="row">
                        <div className="col-md-4">
                            <h5 className="card-title mb-3">{t("stylists")}</h5>
                            <div ref={scrollContainerRef} onScroll={handleScroll} className="list-group" style={{ maxHeight: '425px', overflowY: 'auto' }}>
                                {visibleStylists.map(stylist => (
                                    <a href="#!" key={stylist.id} 
                                       className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedStylist?.id === stylist.id ? 'active' : ''}`} 
                                       onClick={(e) => { 
                                           e.preventDefault(); 
                                           setSelectedStylist(stylist);
                                           setServicesPage(1);
                                           setProductsPage(1);
                                           setExpensesPage(1);
                                           setActiveTab('clients');
                                       }}>
                                        <div className="d-flex align-items-center">
                                            <img src={stylist.avatar} alt={stylist.name} className="rounded-circle me-3" style={{ width: '40px', height: '40px' }}/>
                                            <span>{stylist.name}</span>
                                        </div>
                                        <div className="text-end">
                                            {stylist.hasAdjustments && <span className="badge bg-warning text-dark me-1" style={{fontSize: '9px'}}>{t("adjusted")}</span>}
                                            <span className={`badge ${selectedStylist?.id === stylist.id ? 'bg-white text-primary' : 'bg-light text-dark'}`}>{formatCurrency(stylist.netToPay)}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className="col-md-8">
                            {selectedStylist ? (
                                <div>
                                    <h5 className="card-title mb-3">{t("details_of")} {selectedStylist.name}</h5>
                                    {selectedStylist.stylistTips > 0 && (
                                        <div className="alert alert-info py-2 px-3 mb-3 d-flex justify-content-between align-items-center">
                                            <span><i className="ri-hand-coin-line me-1"></i> {t("period_tips")}</span>
                                            <strong>{formatCurrency(selectedStylist.stylistTips)}</strong>
                                        </div>
                                    )}
                                    <ul className="nav nav-tabs">
                                        <li className="nav-item"><a className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')} href="#!">{t("clients_served")} ({selectedStylist.clients.length})</a></li>
                                        <li className="nav-item"><a className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')} href="#!">{t("inventory_commission")} ({selectedStylist.inventory.length})</a></li>
                                        <li className="nav-item"><a className={`nav-link ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')} href="#!">{t("expenses")} ({selectedStylist.expenses.length})</a></li>
                                    </ul>
                                    <div className="tab-content p-3 border border-top-0">
                                        {activeTab === 'clients' && (
                                            <div>
                                                <table className="table" style={{minHeight: "220px"}}>
                                                    <thead>
                                                        <tr>
                                                            <th>{t("client")}</th>
                                                            <th>{t("service")}</th>
                                                            <th className='text-end'>{t("service_price")}</th>
                                                            <th className='text-end'>{t("net_commission")}</th>
                                                            <th style={{width: '70px'}}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentServices.map((c: Client, index: number) => {
                                                            const realIndex = (servicesPage - 1) * ITEMS_PER_PAGE + index;
                                                            return (
                                                            <tr key={`client-${realIndex}`}>
                                                                <td>{c.client_name}</td>
                                                                <td>{c.service_name}</td>
                                                                <td className='text-end'>{formatCurrency(c.service_price)}</td>
                                                                <td className='text-end fw-bold text-success'>
                                                                    {formatCurrency(c.net_commission)}
                                                                    {c.admin_fee > 0 &&
                                                                        <p className='text-muted fw-normal mb-0' style={{fontSize: '11px'}}>
                                                                            ({t("admin_discount")}: -{formatCurrency(c.admin_fee)})
                                                                        </p>
                                                                    }
                                                                </td>
                                                                <td className="text-end">
                                                                    <button className="btn btn-soft-primary btn-sm me-1" title={t("edit")} onClick={() => handleOpenEdit('service', realIndex)}><i className="ri-pencil-line"></i></button>
                                                                    <button className="btn btn-soft-danger btn-sm" title={t("delete")} onClick={() => handleDeleteItem('service', realIndex)}><i className="ri-delete-bin-line"></i></button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                        {selectedStylist.clients.length === 0 && (
                                                            <tr><td colSpan={5} className="text-center text-muted pt-4">{t("no_services_period")}</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                <TabPagination currentPage={servicesPage} totalPages={totalServicePages} onPageChange={setServicesPage} />
                                            </div>
                                        )}
                                        {activeTab === 'inventory' && (
                                            <div>
                                                <table className="table" style={{minHeight: "220px"}}>
                                                    <thead><tr><th>{t("product")}</th><th className='text-end'>{t("commission_earned")}</th><th style={{width: '70px'}}></th></tr></thead>
                                                    <tbody>
                                                        {currentProducts.map((p: InventoryItem, index: number) => {
                                                            const realIndex = (productsPage - 1) * ITEMS_PER_PAGE + index;
                                                            return (
                                                            <tr key={`product-${realIndex}`}>
                                                                <td>{p.product_name}</td>
                                                                <td className='text-end'>{formatCurrency(p.commission_value)}</td>
                                                                <td className="text-end">
                                                                    <button className="btn btn-soft-primary btn-sm me-1" title={t("edit")} onClick={() => handleOpenEdit('product', realIndex)}><i className="ri-pencil-line"></i></button>
                                                                    <button className="btn btn-soft-danger btn-sm" title={t("delete")} onClick={() => handleDeleteItem('product', realIndex)}><i className="ri-delete-bin-line"></i></button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                        {selectedStylist.inventory.length === 0 && <tr><td colSpan={3} className="text-center text-muted pt-4">{t("no_products_period")}</td></tr>}
                                                    </tbody>
                                                </table>
                                                <TabPagination currentPage={productsPage} totalPages={totalProductPages} onPageChange={setProductsPage} />
                                            </div>
                                        )}
                                        {activeTab === 'expenses' && (
                                            <div>
                                                <table className="table" style={{minHeight: "220px"}}>
                                                    <thead><tr><th>{t("description")}</th><th className='text-end'>{t("amount")}</th><th style={{width: '70px'}}></th></tr></thead>
                                                    <tbody>
                                                        {currentExpenses.map((e: Expense, index: number) => {
                                                            const realIndex = (expensesPage - 1) * ITEMS_PER_PAGE + index;
                                                            return (
                                                            <tr key={`expense-${realIndex}`}>
                                                                <td>{e.description}</td>
                                                                <td className='text-end text-danger'>-{formatCurrency(e.amount)}</td>
                                                                <td className="text-end">
                                                                    <button className="btn btn-soft-primary btn-sm me-1" title={t("edit")} onClick={() => handleOpenEdit('expense', realIndex)}><i className="ri-pencil-line"></i></button>
                                                                    <button className="btn btn-soft-danger btn-sm" title={t("delete")} onClick={() => handleDeleteItem('expense', realIndex)}><i className="ri-delete-bin-line"></i></button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                        {selectedStylist.expenses.length === 0 && <tr><td colSpan={3} className="text-center text-muted pt-4">{t("no_expenses_period")}</td></tr>}
                                                    </tbody>
                                                </table>
                                                <TabPagination currentPage={expensesPage} totalPages={totalExpensePages} onPageChange={setExpensesPage} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-5"><p className="text-muted">{t("select_stylist_details")}</p></div>
                            )}
                        </div>
                    </div></div>
                </div>
                <div className="card mt-4">
                    <div className="card-body d-flex justify-content-between align-items-center">
                        <div><h4 className="card-title mb-0">{t("total_payroll")}</h4><p className="text-muted mb-0">{t("total_payroll_desc")}</p></div>
                        <div className="text-end">
                            <h2 className="text-success me-3 d-inline-block align-middle">{formatCurrency(totalPayroll)}</h2>
                            <button className="btn btn-light me-2" onClick={handleBack}>{t("back_to_list")}</button>
                            <button className="btn btn-info me-2" onClick={() => {
                                const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
                                const apiBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
                                const url = `${apiBase}/payrolls/export-excel?start_date=${startDate}&end_date=${endDate}`;
                                fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                                    .then(r => r.blob())
                                    .then(blob => {
                                        const a = document.createElement('a');
                                        a.href = URL.createObjectURL(blob);
                                        a.download = `nomina_${startDate}_${endDate}.xlsx`;
                                        a.click();
                                        URL.revokeObjectURL(a.href);
                                    })
                                    .catch(() => Swal.fire(t("error"), t("error_downloading_excel") || "Error al descargar Excel", 'error'));
                            }} disabled={allStylistsData.length === 0}>
                                <i className="ri-file-excel-2-line me-1"></i>
                                Excel
                            </button>
                            {periodAlreadySaved ? (
                                <span className="badge bg-success-subtle text-success fs-14 px-3 py-2 align-middle">
                                    <i className="ri-checkbox-circle-line me-1"></i>
                                    {t("saved") || "Guardada"}
                                </span>
                            ) : (
                                <button className="btn btn-success" onClick={handleGenerateAndSave} disabled={isSaving || allStylistsData.length === 0}>
                                    {isSaving ? <Spinner size="sm" className="me-2"/> : <i className="ri-save-line me-1"></i>}
                                    {isSaving ? t("saving") : t("generate_save_payroll")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de edición de item */}
            <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered>
                <ModalHeader toggle={() => setEditModal(false)}>
                    {t("edit_payroll_item")}
                </ModalHeader>
                <ModalBody>
                    {editType === 'service' && (
                        <>
                            <FormGroup>
                                <Label>{t("service_price")}</Label>
                                <Input type="number" step="0.01" value={editValues.service_price || ''} onChange={e => setEditValues(prev => ({ ...prev, service_price: parseFloat(e.target.value) || 0 }))} disabled={transferMode} />
                            </FormGroup>
                            <FormGroup>
                                <Label>{t("net_commission")}</Label>
                                <Input type="number" step="0.01" value={editValues.net_commission || ''} onChange={e => setEditValues(prev => ({ ...prev, net_commission: parseFloat(e.target.value) || 0 }))} disabled={transferMode} />
                            </FormGroup>
                            <hr />
                            <FormGroup check className="mb-3">
                                <Input type="checkbox" id="transferCheck" checked={transferMode} onChange={e => { setTransferMode(e.target.checked); setTransferTargetId(''); }} />
                                <Label check htmlFor="transferCheck" className="fw-semibold">
                                    <i className="ri-arrow-left-right-line me-1"></i>
                                    {t("transfer_service") || "Trasladar este servicio a otro estilista"}
                                </Label>
                            </FormGroup>
                            {transferMode && (
                                <FormGroup>
                                    <Label>{t("select_stylist") || "Seleccionar estilista destino"}</Label>
                                    <Input type="select" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                                        <option value="">{t("select") || "-- Seleccionar --"}</option>
                                        {allStylistsData.filter(s => s.id !== selectedStylist?.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            )}
                        </>
                    )}
                    {editType === 'product' && (
                        <FormGroup>
                            <Label>{t("commission_earned")}</Label>
                            <Input type="number" step="0.01" value={editValues.commission_value || ''} onChange={e => setEditValues(prev => ({ ...prev, commission_value: parseFloat(e.target.value) || 0 }))} />
                        </FormGroup>
                    )}
                    {editType === 'expense' && (
                        <FormGroup>
                            <Label>{t("amount")}</Label>
                            <Input type="number" step="0.01" value={editValues.amount || ''} onChange={e => setEditValues(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                        </FormGroup>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-light" onClick={() => setEditModal(false)}>{t("cancel")}</button>
                    {transferMode ? (
                        <button className="btn btn-warning" onClick={handleSaveEdit} disabled={!transferTargetId}>
                            <i className="ri-arrow-left-right-line me-1"></i>
                            {t("transfer") || "Trasladar"}
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleSaveEdit}>{t("save_changes")}</button>
                    )}
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default PayrollPreview;