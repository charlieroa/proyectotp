import React, { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import {
  Container, Row, Col, Card, CardBody, Label, Input, Button, Badge,
  Spinner, InputGroup, Modal, ModalHeader, ModalBody, ModalFooter, Table, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from "reactstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Select from 'react-select';
import Swal from 'sweetalert2';
import CurrencyInput from 'react-currency-input-field';
import Flatpickr from "react-flatpickr";

import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AppDispatch, RootState } from "../../index";
import { api } from "../../services/api";
import { getTenantIdFromToken } from "../../services/auth";
import { getCalendarData } from "../../slices/thunks";

// --- Tipos de Datos ---
type ClientOption = { value: string; label: string; data: any; };
type ProductOption = { value: string; label: string; data: any; };
type StylistOption = { value: string; label: string; };
type ServiceItem = { id: string; name: string; price: number; stylist: string; stylistId?: string | null; status: string; batchId?: string | null; priceOverride?: number | null; overrideReason?: string | null; ticketItemId?: string; };
type ProductItem = { id: string; name: string; price: number; quantity: number; stock: number; seller_id: string; seller_name: string; ticketItemId?: string; };
type Cart = { services: ServiceItem[]; products: ProductItem[]; };
type LocationState = { clientId?: string; appointmentIds?: string[]; targetTenantId?: string; ticketId?: string; };

const statusColor = (s: string) =>
  s === "checked_in" ? "info" :
  s === "checked_out" ? "warning" :
  s === "completed" ? "success" :
  s === "cancelled" || s === "rescheduled" ? "danger" : "secondary";
const statusLabel: Record<string, string> = {
  scheduled: "Agendado", rescheduled: "Reagendado",
  checked_in: "Check-in", checked_out: "Finalizado",
  completed: "Pagado", cancelled: "Cancelado",
};

const PointOfSale = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();
    const dispatch: AppDispatch = useDispatch();
    const location = useLocation();
    const locationState = location.state as LocationState | undefined;

    const { events: calendarEvents, clients: allClients } = useSelector((state: RootState) => state.Calendar);

    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [stylists, setStylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
    const [cart, setCart] = useState<Cart>({ services: [], products: [] });
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [cashText, setCashText] = useState<string>("");
    const [cardText, setCardText] = useState<string>("");
    const [cardVoucher, setCardVoucher] = useState<string>("");
    const [useCard, setUseCard] = useState<boolean>(false);
    const [tipText, setTipText] = useState<string>("");
    const [tipSalonPercent, setTipSalonPercent] = useState<number>(10);
    const [tipRecipientId, setTipRecipientId] = useState<string>(""); // "" = repartir entre todos
    const [priceOverrideEnabled, setPriceOverrideEnabled] = useState<boolean>(false);
    const [priceModalOpen, setPriceModalOpen] = useState<boolean>(false);
    const [priceEditItem, setPriceEditItem] = useState<ServiceItem | null>(null);
    const [priceEditValue, setPriceEditValue] = useState<string>("");
    const [priceEditReason, setPriceEditReason] = useState<string>("");
    const [newClientModalOpen, setNewClientModalOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
    const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
    
    const [resModalOpen, setResModalOpen] = useState(false);
    const [resItem, setResItem] = useState<ServiceItem | null>(null);
    const [resDateTime, setResDateTime] = useState<string>("");
    
    const [productToAdd, setProductToAdd] = useState<{ product: ProductOption | null; seller: StylistOption | null }>({ product: null, seller: null });
    const [invoiceEmail, setInvoiceEmail] = useState("");
    const [sendingInvoice, setSendingInvoice] = useState(false);

    const isSaleFromAppointment = !!(locationState?.clientId && locationState?.appointmentIds);
    const ticketId = locationState?.ticketId;
    const isTicketMode = !!ticketId;
    const targetTenantId = locationState?.targetTenantId;
    const initialCartLoaded = useRef(false);
    const [ticketData, setTicketData] = useState<any>(null);
    const [walkInName, setWalkInName] = useState<string>("");

    // Catálogo de servicios (necesario para modo ticket: agregar servicios sueltos)
    type CatalogService = { id: string; name: string; price: number };
    const [availableServices, setAvailableServices] = useState<CatalogService[]>([]);
    const [serviceToAdd, setServiceToAdd] = useState<{ service: { value: string; label: string; data: CatalogService } | null; seller: StylistOption | null }>({ service: null, seller: null });

    useEffect(() => {
        const fetchPrerequisites = async () => {
            setLoading(true);
            try {
                const productsPromise = api.get('/products', { params: { audience: 'cliente', ...(targetTenantId ? { target_tenant_id: targetTenantId } : {}) } });
                const tenantIdForStylists = targetTenantId || getTenantIdFromToken();
                const stylistsPromise = tenantIdForStylists
                    ? api.get(`/users/tenant/${tenantIdForStylists}`, { params: { role_id: 3 } })
                    : api.get('/stylists');
                if (!allClients || allClients.length === 0) { dispatch(getCalendarData()); }
                const tenantSettingsPromise = api.get('/tenants/my-businesses').catch(() => ({ data: [] }));
                // Catálogo de servicios (para modo ticket virtual)
                const tenantIdForSvc = targetTenantId || getTenantIdFromToken();
                const servicesPromise = tenantIdForSvc
                    ? api.get(`/services/tenant/${tenantIdForSvc}`).catch(() => ({ data: [] }))
                    : Promise.resolve({ data: [] });
                const [productsRes, stylistsRes, tenantRes, servicesRes] = await Promise.all([productsPromise, stylistsPromise, tenantSettingsPromise, servicesPromise]);
                setAvailableProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
                setStylists(Array.isArray(stylistsRes.data) ? stylistsRes.data : []);
                setAvailableServices(Array.isArray(servicesRes.data) ? servicesRes.data.map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price || 0) })) : []);
                // Get tip_salon_percent and price_override flag from first business (current tenant)
                if (Array.isArray(tenantRes.data) && tenantRes.data.length > 0) {
                    const myTenant = tenantRes.data[0];
                    if (myTenant?.tip_salon_percent != null) setTipSalonPercent(Number(myTenant.tip_salon_percent));
                    setPriceOverrideEnabled(!!myTenant?.price_override_enabled);
                }
            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
                Swal.fire(t("error"), "No se pudieron cargar los datos necesarios.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchPrerequisites();
    }, [dispatch]);

    const clientOptions = useMemo<ClientOption[]>(() => 
        (allClients || []).map((client: any) => ({ value: client.id, label: `${client.first_name || ''} ${client.last_name || ''} (${client.phone || 'Sin teléfono'})`, data: client })),
    [allClients]);

    // Modo ticket virtual: cargar el ticket y poblar el cart con sus invoice_items
    useEffect(() => {
        if (!isTicketMode || !ticketId) return;
        if (initialCartLoaded.current) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/tickets/${ticketId}`);
                if (cancelled) return;
                setTicketData(data);
                // Cliente (registrado o walk-in) — siempre fijamos selectedClient para
                // que el dropdown muestre el nombre y los pickers de producto/servicio
                // (que están deshabilitados si !selectedClient) queden habilitados.
                if (data.client_id) {
                    const found = clientOptions.find((c) => c.value === data.client_id);
                    if (found) setSelectedClient(found);
                    else if (data.users) {
                        setSelectedClient({
                            value: data.client_id,
                            label: `${data.users.first_name || ''} ${data.users.last_name || ''}`.trim() || 'Cliente',
                            data: data.users,
                        });
                    }
                } else if (data.client_name_adhoc) {
                    setWalkInName(data.client_name_adhoc);
                    setSelectedClient({
                        value: `walkin:${ticketId}`,
                        label: `${data.client_name_adhoc} (walk-in)`,
                        data: { first_name: data.client_name_adhoc, walk_in: true },
                    });
                }
                // Poblar cart con los items del ticket
                const services: ServiceItem[] = [];
                const products: ProductItem[] = [];
                for (const it of (data.invoice_items || [])) {
                    const unit = Number(it.unit_price || 0);
                    const orig = it.original_unit_price != null ? Number(it.original_unit_price) : null;
                    const overridden = orig != null && orig !== unit;
                    const sellerName = it.users ? `${it.users.first_name || ''} ${it.users.last_name || ''}`.trim() : '';
                    if (it.item_type === 'service' || it.item_type === 'custom') {
                        services.push({
                            id: it.id,
                            name: it.description,
                            price: orig ?? unit,
                            stylist: sellerName || 'N/A',
                            stylistId: it.seller_id || it.users?.id || null,
                            status: 'checked_out',
                            priceOverride: overridden ? unit : null,
                            overrideReason: it.override_reason || null,
                            ticketItemId: it.id,
                        });
                    } else if (it.item_type === 'product') {
                        products.push({
                            id: it.id,
                            name: it.description,
                            price: unit,
                            quantity: Number(it.quantity || 1),
                            stock: 99,
                            seller_id: it.seller_id || '',
                            seller_name: sellerName,
                            ticketItemId: it.id,
                        });
                    }
                }
                setCart({ services, products });
                initialCartLoaded.current = true;
            } catch (err: any) {
                Swal.fire('Error', err?.response?.data?.error || 'No se pudo cargar el ticket.', 'error');
                navigate('/calendar');
            }
        })();
        return () => { cancelled = true; };
    }, [isTicketMode, ticketId, clientOptions, navigate]);

    useEffect(() => {
        if (initialCartLoaded.current) return; // No re-cargar después del check-in/checkout
        if (isSaleFromAppointment && allClients.length > 0 && calendarEvents.length > 0) {
            const clientToSelect = clientOptions.find(c => c.value === locationState.clientId);
            if (clientToSelect) { setSelectedClient(clientToSelect); }

            // Cargar las citas solicitadas
            const requestedIds = new Set((locationState.appointmentIds || []).map(String));
            const requestedEvents = calendarEvents.filter((event: any) => requestedIds.has(String(event.id)));

            // Buscar batch_ids de las citas solicitadas para incluir todas las del mismo batch
            const batchIds = new Set<string>();
            requestedEvents.forEach((event: any) => {
              if (event.extendedProps?.batch_id) batchIds.add(event.extendedProps.batch_id);
            });

            // Agregar citas del mismo batch que no estén ya incluidas
            const allIds = new Set(requestedIds);
            if (batchIds.size > 0) {
              calendarEvents.forEach((event: any) => {
                if (event.extendedProps?.batch_id && batchIds.has(event.extendedProps.batch_id) && !allIds.has(String(event.id))) {
                  allIds.add(String(event.id));
                }
              });
            }

            const servicesToLoad: ServiceItem[] = calendarEvents
              .filter((event: any) => allIds.has(String(event.id)))
              .filter((event: any) => !['completed', 'cancelled'].includes(event.extendedProps?.status))
              .map((event: any) => ({
                id: event.id, name: event.extendedProps.service_name || "Servicio",
                price: Number(event.extendedProps.price || 0), stylist: event.extendedProps.stylist_first_name || 'N/A',
                stylistId: event.extendedProps.stylist_id || null,
                status: event.extendedProps.status || 'scheduled',
                batchId: event.extendedProps.batch_id || null,
              }));

            setCart(prev => ({ ...prev, services: servicesToLoad }));
            initialCartLoaded.current = true;
        }
    }, [locationState, allClients, calendarEvents, clientOptions, isSaleFromAppointment]);

    document.title = `${t("point_of_sale")} | StyleApp`;

    const productOptions = useMemo<ProductOption[]>(() =>
        availableProducts.map(p => ({ value: p.id, label: `${p.name} - ${formatCurrency(p.sale_price)}`, data: p })),
    [availableProducts, formatCurrency]);

    const stylistOptions = useMemo<StylistOption[]>(() => 
        stylists.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name || ''}` })),
    [stylists]);

    const defaultSeller = useMemo<StylistOption | null>(() => {
        const serviceStylistIds = new Set(cart.services.map(s => calendarEvents.find((e: any) => String(e.id) === s.id)?.extendedProps.stylist_id).filter(Boolean));
        if (serviceStylistIds.size === 1) {
            const singleStylistId = Array.from(serviceStylistIds)[0];
            return stylistOptions.find(opt => opt.value === singleStylistId) || null;
        }
        return null;
    }, [cart.services, calendarEvents, stylistOptions]);
    
    useEffect(() => {
        if(defaultSeller) {
            setProductToAdd(prev => ({...prev, seller: defaultSeller}));
        } else {
            setProductToAdd(prev => ({...prev, seller: null}));
        }
    }, [defaultSeller]);

    const addProductToCart = async () => {
        if (!productToAdd.product || !productToAdd.seller) return;
        const product = productToAdd.product.data;

        // En modo ticket virtual: persistimos la línea vía API y refrescamos el ticket.
        if (isTicketMode && ticketId) {
            try {
                await api.post(`/tickets/${ticketId}/items`, {
                    item_type: 'product',
                    related_id: product.id,
                    description: product.name,
                    quantity: 1,
                    unit_price: Number(product.sale_price || 0),
                    seller_id: productToAdd.seller.value,
                });
                await reloadTicketCart();
                setProductToAdd({ product: null, seller: defaultSeller });
            } catch (err: any) {
                Swal.fire('Error', err?.response?.data?.error || 'No se pudo agregar el producto.', 'error');
            }
            return;
        }

        setCart(prev => {
            const existing = prev.products.find(p => p.id === product.id);
            if (existing) {
                const newQuantity = Math.min(existing.stock, existing.quantity + 1);
                return { ...prev, products: prev.products.map(p => p.id === product.id ? { ...p, quantity: newQuantity } : p) };
            }
            return { ...prev, products: [...prev.products, { id: product.id, name: product.name, price: product.sale_price, quantity: 1, stock: product.stock, seller_id: productToAdd.seller!.value, seller_name: productToAdd.seller!.label }] };
        });
        setProductToAdd({ product: null, seller: defaultSeller });
    };

    // Agregar servicio al ticket (solo modo ticket virtual)
    const addServiceToTicket = async () => {
        if (!ticketId || !serviceToAdd.service || !serviceToAdd.seller) return;
        const svc = serviceToAdd.service.data;
        try {
            await api.post(`/tickets/${ticketId}/items`, {
                item_type: 'service',
                related_id: svc.id,
                description: svc.name,
                quantity: 1,
                unit_price: Number(svc.price || 0),
                seller_id: serviceToAdd.seller.value,
            });
            await reloadTicketCart();
            setServiceToAdd({ service: null, seller: null });
        } catch (err: any) {
            Swal.fire('Error', err?.response?.data?.error || 'No se pudo agregar el servicio.', 'error');
        }
    };

    // Recarga el ticket y repobla cart (usado después de agregar/borrar líneas)
    const reloadTicketCart = async () => {
        if (!ticketId) return;
        try {
            const { data } = await api.get(`/tickets/${ticketId}`);
            setTicketData(data);
            const services: ServiceItem[] = [];
            const products: ProductItem[] = [];
            for (const it of (data.invoice_items || [])) {
                const unit = Number(it.unit_price || 0);
                const orig = it.original_unit_price != null ? Number(it.original_unit_price) : null;
                const overridden = orig != null && orig !== unit;
                const sellerName = it.users ? `${it.users.first_name || ''} ${it.users.last_name || ''}`.trim() : '';
                if (it.item_type === 'service' || it.item_type === 'custom') {
                    services.push({
                        id: it.id,
                        name: it.description,
                        price: orig ?? unit,
                        stylist: sellerName || 'N/A',
                        stylistId: it.seller_id || it.users?.id || null,
                        status: 'checked_out',
                        priceOverride: overridden ? unit : null,
                        overrideReason: it.override_reason || null,
                        ticketItemId: it.id,
                    });
                } else if (it.item_type === 'product') {
                    products.push({
                        id: it.id,
                        name: it.description,
                        price: unit,
                        quantity: Number(it.quantity || 1),
                        stock: 99,
                        seller_id: it.seller_id || '',
                        seller_name: sellerName,
                        ticketItemId: it.id,
                    });
                }
            }
            setCart({ services, products });
        } catch (err) {
            console.error('reloadTicketCart', err);
        }
    };
    
    const handleQuantityChange = (productId: string, newQuantity: number) => {
        setCart(prev => ({...prev, products: prev.products.map(p => {
                if (p.id === productId) {
                    const validatedQty = Math.max(1, Math.min(p.stock, newQuantity || 1));
                    return { ...p, quantity: validatedQty };
                }
                return p;
            })
        }));
    };

    const removeCartItem = async (type: 'service' | 'product', id: string) => {
        // En modo ticket: las líneas viven en el backend. Borramos vía API y recargamos.
        if (isTicketMode && ticketId) {
            try {
                await api.delete(`/tickets/${ticketId}/items/${id}`);
                await reloadTicketCart();
            } catch (err: any) {
                Swal.fire('Error', err?.response?.data?.error || 'No se pudo borrar la línea.', 'error');
            }
            return;
        }
        setCart(prev => ({...prev, [type === 'service' ? 'services' : 'products']: prev[type === 'service' ? 'services' : 'products'].filter((item: any) => item.id !== id) }));
    };

    const handleServiceStatusChange = async (serviceId: string, newStatus: string) => {
        setUpdatingStatus(prev => ({ ...prev, [serviceId]: true }));
        try {
            if (newStatus === 'checked_in') await api.patch(`/appointments/${serviceId}/checkin`);
            else if (newStatus === 'checked_out') await api.patch(`/appointments/${serviceId}/checkout`);
            else await api.patch(`/appointments/${serviceId}/status`, { status: newStatus });
            
            setCart(prev => ({...prev, services: prev.services.map(s => s.id === serviceId ? { ...s, status: newStatus } : s) }));
            dispatch(getCalendarData());
        } catch (e) {
            Swal.fire(t("error"), t("could_not_change_status"), "error");
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [serviceId]: false }));
        }
    };

    const openRescheduleModal = (item: ServiceItem) => {
        setResItem(item);
        const now = new Date();
        now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        const isoLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setResDateTime(isoLocal);
        setResModalOpen(true);
    };

    const submitReschedule = async () => {
        if (!resItem || !resDateTime) return;
        setUpdatingStatus(prev => ({ ...prev, [resItem.id]: true }));
        try {
            await api.patch(`/appointments/${resItem.id}/reschedule`, { start_time: new Date(resDateTime).toISOString() });
            setCart(prev => ({...prev, services: prev.services.map(s => s.id === resItem.id ? { ...s, status: 'rescheduled' } : s) }));
            dispatch(getCalendarData());
            setResModalOpen(false);
        } catch(e) {
            Swal.fire(t("error"), t("could_not_reschedule"), "error");
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [resItem.id]: false }));
        }
    };

    const effectivePrice = (item: ServiceItem) => (item.priceOverride != null ? item.priceOverride : item.price);

    const servicesReadyForPayment = useMemo(() => cart.services.filter(s => s.status === 'checked_out'), [cart.services]);
    const total = useMemo(() => {
        const servicesTotal = servicesReadyForPayment.reduce((sum, item) => sum + effectivePrice(item), 0);
        const productsTotal = cart.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return servicesTotal + productsTotal;
    }, [cart.products, servicesReadyForPayment]);

    const openPriceModal = (item: ServiceItem) => {
        setPriceEditItem(item);
        setPriceEditValue(String(item.priceOverride != null ? item.priceOverride : item.price));
        setPriceEditReason(item.overrideReason || "");
        setPriceModalOpen(true);
    };
    const submitPriceOverride = async () => {
        if (!priceEditItem) return;
        const n = Number(priceEditValue);
        if (!Number.isFinite(n) || n < 0) {
            Swal.fire(t("error"), t("invalid_price") || "Precio invalido", "error");
            return;
        }
        const reason = priceEditReason.trim();
        if (n !== priceEditItem.price && !reason) {
            Swal.fire(t("error"), t("price_override_reason_required") || "Escribe un motivo para modificar el precio", "error");
            return;
        }
        // En modo ticket, las líneas viven en el backend → persistimos vía PATCH.
        if (isTicketMode && ticketId && priceEditItem.ticketItemId) {
            try {
                await api.patch(`/tickets/${ticketId}/items/${priceEditItem.ticketItemId}`, {
                    unit_price: n,
                    override_reason: n !== priceEditItem.price ? reason : null,
                });
                await reloadTicketCart();
                setPriceModalOpen(false);
                setPriceEditItem(null);
            } catch (err: any) {
                Swal.fire(t("error"), err?.response?.data?.error || "No se pudo modificar el precio.", "error");
            }
            return;
        }
        setCart(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === priceEditItem.id
                ? { ...s, priceOverride: n === s.price ? null : n, overrideReason: n === s.price ? null : reason }
                : s)
        }));
        setPriceModalOpen(false);
        setPriceEditItem(null);
    };
    const clearPriceOverride = async (serviceId: string) => {
        const item = cart.services.find(s => s.id === serviceId);
        if (isTicketMode && ticketId && item?.ticketItemId) {
            try {
                await api.patch(`/tickets/${ticketId}/items/${item.ticketItemId}`, {
                    unit_price: item.price,
                    override_reason: null,
                });
                await reloadTicketCart();
            } catch (err: any) {
                Swal.fire(t("error"), err?.response?.data?.error || "No se pudo restaurar el precio.", "error");
            }
            return;
        }
        setCart(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === serviceId ? { ...s, priceOverride: null, overrideReason: null } : s)
        }));
    };

    const cashAmountNum = Number(cashText) || 0;
    const cardAmountNum = Number(cardText) || 0;
    const tipAmountNum = Number(tipText) || 0;
    const paidTotal = cashAmountNum + (useCard ? cardAmountNum : 0);
    const totalWithTip = total + tipAmountNum;
    const change = paidTotal - totalWithTip;
    const canPay = selectedClient && total > 0 && paidTotal >= totalWithTip && !isProcessingPayment;

    // Estilistas con servicios en este ticket: opciones para "Propina para..."
    const tipRecipientOptions = useMemo(() => {
        const seen = new Map<string, string>();
        for (const s of cart.services) {
            if (s.stylistId && !seen.has(s.stylistId)) seen.set(s.stylistId, s.stylist);
        }
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [cart.services]);

    // Si el estilista seleccionado deja de estar en el ticket, resetear a "todos"
    useEffect(() => {
        if (tipRecipientId && !tipRecipientOptions.some(o => o.id === tipRecipientId)) {
            setTipRecipientId("");
        }
    }, [tipRecipientOptions, tipRecipientId]);

    const handlePayNow = async () => {
        setIsProcessingPayment(true);
        try {
            // --- MODO TICKET VIRTUAL ---
            // El invoice ya existe; las líneas ya están en el ticket. Solo cerramos.
            if (isTicketMode && ticketId) {
                const method = useCard && cardAmountNum > 0 && cashAmountNum === 0
                    ? 'card'
                    : (useCard && cardAmountNum > 0 && cashAmountNum > 0 ? 'mixed' : 'cash');
                const response = await api.post(`/tickets/${ticketId}/close`, {
                    tip_amount: tipAmountNum,
                    payment_method: method,
                    tip_recipient_user_id: tipAmountNum > 0 && tipRecipientId ? tipRecipientId : null,
                });
                await dispatch(getCalendarData());
                const clientData = selectedClient?.data;
                const clientEmail = clientData?.email || '';
                setPaymentSuccess({
                    invoiceId: response.data?.invoice?.id || ticketId,
                    change,
                    clientEmail,
                    clientName: `${clientData?.first_name || ''} ${clientData?.last_name || ''}`.trim() || walkInName,
                });
                if (clientEmail) setInvoiceEmail(clientEmail);
                return;
            }

            // --- MODO CLÁSICO (venta desde citas) ---
            const payments = [];
            if (cashAmountNum > 0) payments.push({ payment_method: 'cash', amount: cashAmountNum });
            if (useCard && cardAmountNum > 0) payments.push({ payment_method: 'credit_card', amount: cardAmountNum, voucher: cardVoucher });

            const payload = {
                client_id: selectedClient?.value,
                services: servicesReadyForPayment.map(s => (
                    s.priceOverride != null
                        ? { id: s.id, price_override: s.priceOverride, override_reason: s.overrideReason || null }
                        : s.id
                )),
                products: cart.products.map(p => ({
                    product_id: p.id,
                    quantity: p.quantity,
                    seller_id: p.seller_id
                })),
                payments: payments,
                tip_amount: tipAmountNum,
                tip_recipient_user_id: tipAmountNum > 0 && tipRecipientId ? tipRecipientId : null,
            };

            const response = await api.post('/payments', payload);
            await dispatch(getCalendarData());
            const clientData = selectedClient?.data;
            const clientEmail = clientData?.email || '';
            setPaymentSuccess({ invoiceId: response.data.invoiceId, change: change, clientEmail, clientName: `${clientData?.first_name || ''} ${clientData?.last_name || ''}`.trim() });
            if (clientEmail) setInvoiceEmail(clientEmail);

        } catch (e: any) {
            Swal.fire('Error en el Pago', e?.response?.data?.error || e.message || 'Ocurrió un error inesperado.', 'error');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    if (loading) {
        return (<div className="page-content"><Container fluid><div className="text-center p-5"><Spinner /> <span className="ms-2 fs-5">{t("loading")}</span></div></Container></div>);
    }
    
    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title={t("point_of_sale")} pageTitle={t("checkout")} />

                {isTicketMode && !paymentSuccess && (
                    <div
                        className="alert d-flex align-items-center mb-3 py-2 px-3"
                        style={{
                            borderLeft: '4px solid #7c3aed',
                            background: 'rgba(124,58,237,0.08)',
                            color: '#5b21b6',
                            border: '1px solid rgba(124,58,237,0.25)',
                        }}
                    >
                        <i className="ri-bill-line me-2" style={{ fontSize: 18 }}></i>
                        <div className="flex-grow-1">
                            <strong>Ticket Virtual</strong> — cobrando a{' '}
                            <strong>
                                {selectedClient?.label?.split(' (')[0] || walkInName || 'Walk-in'}
                            </strong>
                            {ticketData?.opened_by_user && (
                                <small className="text-muted ms-2">
                                    · abierto por {ticketData.opened_by_user.first_name}
                                </small>
                            )}
                        </div>
                        <Badge color="primary" pill>
                            {(ticketData?.invoice_items?.length || 0)} línea
                            {(ticketData?.invoice_items?.length || 0) === 1 ? '' : 's'}
                        </Badge>
                    </div>
                )}

                {paymentSuccess ? (
                    <Row>
                        <Col xl={{ size: 8, offset: 2 }}>
                            <Card>
                                <CardBody className="text-center py-5">
                                    <i className="ri-checkbox-circle-line display-4 text-success mb-4"></i>
                                    <h5>{t("payment_completed")}</h5>
                                    <p className="text-muted">{t("sale_recorded")}</p>
                                    <h3 className="fw-semibold">
                                        {t("invoice_id")} <span className="text-primary text-decoration-underline">{paymentSuccess.invoiceId}</span>
                                    </h3>
                                    {paymentSuccess.change > 0 && (
                                        <h4 className="fw-semibold mt-3">
                                            {t("change")} <span className="text-info">{formatCurrency(paymentSuccess.change)}</span>
                                        </h4>
                                    )}
                                    <div className="mt-4 d-flex flex-column align-items-center gap-3">
                                        <div className="border rounded p-3" style={{ maxWidth: 400, width: '100%' }}>
                                            <h6 className="mb-2"><i className="ri-mail-send-line me-1"></i> {t("send_electronic_invoice") || "Enviar factura electrónica"}</h6>
                                            <InputGroup>
                                                <Input
                                                    type="email"
                                                    placeholder={t("client_email") || "Email del cliente"}
                                                    value={invoiceEmail}
                                                    onChange={(e) => setInvoiceEmail(e.target.value)}
                                                />
                                                <Button
                                                    color="info"
                                                    disabled={!invoiceEmail || sendingInvoice}
                                                    onClick={async () => {
                                                        setSendingInvoice(true);
                                                        try {
                                                            await api.post('/payments/send-invoice', {
                                                                invoice_id: paymentSuccess.invoiceId,
                                                                client_email: invoiceEmail,
                                                            });
                                                            Swal.fire(t("success") || "Éxito", t("invoice_sent") || "Factura enviada al correo del cliente", "success");
                                                        } catch (err: any) {
                                                            Swal.fire(t("error"), err?.response?.data?.error || "Error al enviar factura", "error");
                                                        } finally {
                                                            setSendingInvoice(false);
                                                        }
                                                    }}
                                                >
                                                    {sendingInvoice ? <Spinner size="sm" /> : <i className="ri-send-plane-fill"></i>}
                                                </Button>
                                            </InputGroup>
                                        </div>
                                        <Button color="success" onClick={() => navigate("/calendar")}>{t("back_to_calendar")}</Button>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                ) : (
                <Row>
                    <Col xl={7}>
                        <Card>
                            <CardBody>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div className="d-flex align-items-center gap-2"><h4 className="mb-0">{t("point_of_sale")}</h4></div>
                                    <Button color="soft-secondary" onClick={() => navigate("/calendar")} title={t("back_to_calendar")}><i className="ri-calendar-line me-1"></i> {t("back_to_calendar")}</Button>
                                </div>
                                <div className="mb-4">
                                    <div className="d-flex align-items-center mb-3"><span className="me-2 text-primary fw-bold">1</span><h5 className="mb-0">{t("client")}</h5></div>
                                    <InputGroup>
                                        <Select
                                            className="flex-grow-1"
                                            isClearable={!isSaleFromAppointment && !isTicketMode}
                                            isSearchable={!isSaleFromAppointment && !isTicketMode}
                                            placeholder={isSaleFromAppointment ? t("appointment_client") : t("search_client_pos")}
                                            options={clientOptions}
                                            onChange={(option: ClientOption | null) => setSelectedClient(option)}
                                            value={selectedClient}
                                            isLoading={loading}
                                            isDisabled={isSaleFromAppointment || isTicketMode}
                                        />
                                        {!isSaleFromAppointment && !isTicketMode && (
                                            <Button color="primary" outline onClick={() => setNewClientModalOpen(true)}><i className="ri-add-line"></i></Button>
                                        )}
                                    </InputGroup>
                                </div>

                                {/* Agregar servicio (solo en modo ticket virtual — POS clásico toma servicios de citas) */}
                                {isTicketMode && (
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center mb-3">
                                            <span className="me-2 text-primary fw-bold">2</span>
                                            <h5 className="mb-0">Agregar servicio</h5>
                                        </div>
                                        <Row className="g-2">
                                            <Col sm={5}>
                                                <Label>Servicio</Label>
                                                <Select
                                                    isSearchable
                                                    placeholder="Buscar servicio..."
                                                    options={availableServices.map((s) => ({ value: s.id, label: `${s.name} - ${formatCurrency(s.price)}`, data: s }))}
                                                    value={serviceToAdd.service}
                                                    onChange={(opt: any) => setServiceToAdd((prev) => ({ ...prev, service: opt }))}
                                                />
                                            </Col>
                                            <Col sm={5}>
                                                <Label>Estilista</Label>
                                                <Select
                                                    isSearchable
                                                    placeholder="Selecciona estilista..."
                                                    options={stylistOptions}
                                                    value={serviceToAdd.seller}
                                                    onChange={(opt: StylistOption | null) => setServiceToAdd((prev) => ({ ...prev, seller: opt }))}
                                                />
                                            </Col>
                                            <Col sm={2} className="d-flex align-items-end">
                                                <Button
                                                    color="primary"
                                                    className="w-100"
                                                    onClick={addServiceToTicket}
                                                    disabled={!serviceToAdd.service || !serviceToAdd.seller || isProcessingPayment}
                                                >
                                                    Añadir
                                                </Button>
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="d-flex align-items-center mb-3"><span className="me-2 text-primary fw-bold">{isTicketMode ? '3' : '2'}</span><h5 className="mb-0">{t("add_products")}</h5></div>
                                    {/* --- LAYOUT CORREGIDO --- */}
                                    <Row className="g-2">
                                        <Col sm={5}>
                                            <Label>{t("product")}</Label>
                                            <Select isSearchable placeholder={t("search_product")} options={productOptions}
                                                value={productToAdd.product}
                                                onChange={(opt: ProductOption | null) => setProductToAdd(prev => ({...prev, product: opt}))}
                                                isDisabled={!selectedClient}
                                            />
                                        </Col>
                                        <Col sm={5}>
                                            <Label>{t("sold_by")}</Label>
                                            <Select isSearchable placeholder={t("select_stylist_pos")} options={stylistOptions}
                                                value={productToAdd.seller}
                                                onChange={(opt: StylistOption | null) => setProductToAdd(prev => ({...prev, seller: opt}))}
                                                isDisabled={!selectedClient} // <-- CORRECCIÓN: YA NO SE CONGELA
                                            />
                                        </Col>
                                        <Col sm={2} className="d-flex align-items-end">
                                            <Button color="primary" className="w-100" onClick={addProductToCart} disabled={!productToAdd.product || !productToAdd.seller}>{t("add")}</Button>
                                        </Col>
                                    </Row>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center mb-3"><span className="me-2 text-primary fw-bold">{isTicketMode ? '4' : '3'}</span><h5 className="mb-0">{t("payment_method")}</h5></div>
                                    <Card className="p-3 border shadow-none"><Row className="gy-3">
                                        <Col md={6}><h6 className="mb-2">{t("pay_cash")}</h6><Label className="form-label">{t("enter_amount")}</Label><CurrencyInput className="form-control" placeholder="$ 0" value={cashText} onValueChange={(value) => setCashText(value || "")} prefix="$ " groupSeparator="." decimalSeparator="," /></Col>
                                        <Col md={6}><div className="d-flex justify-content-between align-items-center mb-2"><h6 className="mb-0">{t("pay_card")}</h6><div className="form-check form-switch m-0"><Input className="form-check-input" type="checkbox" id="useCard" checked={useCard} onChange={(e) => setUseCard(e.target.checked)} /></div></div><Label className="form-label">{t("voucher_number")}</Label><Input value={cardVoucher} onChange={(e) => setCardVoucher(e.target.value)} placeholder="Ej: 123456" disabled={!useCard} /><Label className="form-label mt-2">{t("card_amount")}</Label><CurrencyInput className="form-control" placeholder="$ 0" value={cardText} onValueChange={(value) => setCardText(value || "")} prefix="$ " groupSeparator="." decimalSeparator="," disabled={!useCard} /></Col>
                                        <Col md={12}>
                                            <hr className="my-2" />
                                            <h6 className="mb-2">{t("tip_optional")}</h6>
                                            <Row className="align-items-end g-2">
                                                <Col md={4}>
                                                    <Label className="form-label">{t("tip_amount")}</Label>
                                                    <CurrencyInput className="form-control" placeholder="$ 0" value={tipText} onValueChange={(value) => setTipText(value || "")} prefix="$ " groupSeparator="." decimalSeparator="," />
                                                </Col>
                                                {tipAmountNum > 0 && (
                                                    <Col md={4}>
                                                        <Label className="form-label">{t("tip_recipient") || "Propina para"}</Label>
                                                        <Input type="select" value={tipRecipientId} onChange={(e) => setTipRecipientId(e.target.value)}>
                                                            <option value="">{t("tip_for_all") || "Todos los estilistas"}</option>
                                                            {tipRecipientOptions.map(opt => (
                                                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                            ))}
                                                        </Input>
                                                    </Col>
                                                )}
                                                {tipAmountNum > 0 && (
                                                    <Col md={4}>
                                                        <div className="text-muted small">
                                                            <div>{t("salon_pct")} ({tipSalonPercent}%): <strong>{formatCurrency(Math.round(tipAmountNum * tipSalonPercent / 100))}</strong></div>
                                                            <div>
                                                                {tipRecipientId
                                                                    ? <>Estilista: <strong>{formatCurrency(Math.round(tipAmountNum * (1 - tipSalonPercent / 100)))}</strong></>
                                                                    : <>{t("stylist_pct")} ({100 - tipSalonPercent}%): <strong>{formatCurrency(Math.round(tipAmountNum * (1 - tipSalonPercent / 100)))}</strong></>}
                                                            </div>
                                                        </div>
                                                    </Col>
                                                )}
                                            </Row>
                                        </Col>
                                    </Row></Card>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>

                    <Col xl={5}>
                        <Card>
                            <CardBody>
                                <div className="d-flex align-items-center mb-3"><h5 className="card-title mb-0 flex-grow-1">{t("sales_summary")}</h5><Badge color="dark" pill>{cart.services.length + cart.products.length} {t("items")}</Badge></div>
                                <div className="table-responsive table-card" style={{minHeight: "150px"}}>
                                    {cart.services.length === 0 && cart.products.length === 0 ? (<p className="text-center text-muted p-4">{t("cart_empty")}</p>) : (
                                    <Table borderless className="align-middle mb-0">
                                        <thead className="table-light text-muted"><tr><th>{t("description")}</th><th style={{width: 140}}>{t("status_quantity")}</th><th className="text-end">{t("total")}</th><th></th></tr></thead>
                                        <tbody>
                                            {cart.services.map(item => {
                                                const isBusy = !!updatingStatus[item.id];
                                                let buttonText = statusLabel[item.status] || item.status;
                                                let buttonAction = () => {};
                                                let buttonDisabled = true;

                                                if(item.status === 'scheduled') { buttonText = t("check_in"); buttonAction = () => handleServiceStatusChange(item.id, 'checked_in'); buttonDisabled = false; }
                                                else if (item.status === 'checked_in') { buttonText = t("finish"); buttonAction = () => handleServiceStatusChange(item.id, 'checked_out'); buttonDisabled = false; }

                                                return (
                                                    <tr key={`s-${item.id}`}>
                                                        <td><span className="fw-semibold">{item.name}</span><small className="d-block text-muted">(Servicio con {item.stylist})</small>{item.batchId && <Badge color="soft-info" className="mt-1" pill><i className="ri-links-line me-1"></i>Agrupado</Badge>}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-1">
                                                                <Button size="sm" color={statusColor(item.status)} onClick={buttonAction} disabled={buttonDisabled || isBusy} className="flex-grow-1">{isBusy ? <Spinner size="sm" /> : buttonText}</Button>
                                                                <UncontrolledDropdown>
                                                                    <DropdownToggle tag="button" className="btn btn-sm btn-soft-secondary"><i className="ri-more-2-fill"></i></DropdownToggle>
                                                                    <DropdownMenu>
                                                                        <DropdownItem onClick={() => openRescheduleModal(item)} disabled={isBusy || item.status === 'completed'}>{t("reschedule")}</DropdownItem>
                                                                        <DropdownItem onClick={() => handleServiceStatusChange(item.id, 'cancelled')} disabled={isBusy || item.status === 'completed' || item.status === 'cancelled'}>{t("cancel_appointment")}</DropdownItem>
                                                                    </DropdownMenu>
                                                                </UncontrolledDropdown>
                                                            </div>
                                                        </td>
                                                        <td className="text-end">
                                                            {item.priceOverride != null ? (
                                                                <>
                                                                    <div className="text-muted small text-decoration-line-through">{formatCurrency(item.price)}</div>
                                                                    <div className="fw-semibold text-warning">{formatCurrency(item.priceOverride)}</div>
                                                                    {item.overrideReason && <div className="text-muted fs-11 fst-italic">{item.overrideReason}</div>}
                                                                </>
                                                            ) : (
                                                                formatCurrency(item.price)
                                                            )}
                                                            {priceOverrideEnabled && (
                                                                <div className="mt-1 d-flex justify-content-end gap-1">
                                                                    <Button size="sm" color="soft-warning" className="btn-icon" onClick={() => openPriceModal(item)} title={t("edit_price") || "Editar precio"}>
                                                                        <i className="ri-price-tag-3-line"></i>
                                                                    </Button>
                                                                    {item.priceOverride != null && (
                                                                        <Button size="sm" color="soft-secondary" className="btn-icon" onClick={() => clearPriceOverride(item.id)} title={t("reset_price") || "Restaurar precio"}>
                                                                            <i className="ri-refresh-line"></i>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td><Button close size="sm" onClick={() => removeCartItem('service', item.id)}/></td>
                                                    </tr>
                                                );
                                            })}
                                            {cart.products.map(item => (
                                                <tr key={`p-${item.id}`}>
                                                    <td><span className="fw-semibold">{item.name}</span><small className="d-block text-muted">{t("sold_by")}: {item.seller_name}</small></td>
                                                    <td>
                                                        <InputGroup size="sm" style={{width: "110px"}}>
                                                            <Button outline color="primary" onClick={() => handleQuantityChange(item.id, item.quantity - 1)}>-</Button>
                                                            <Input type="number" className="text-center" value={item.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => handleQuantityChange(item.id, parseInt(e.target.value, 10))} min={1} max={item.stock} />
                                                            <Button outline color="primary" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</Button>
                                                        </InputGroup>
                                                    </td>
                                                    <td className="text-end">{formatCurrency(item.price * item.quantity)}</td>
                                                    <td><Button close size="sm" onClick={() => removeCartItem('product', item.id)}/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    )}
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between"><span>{t("subtotal_all")}</span><span className="fw-medium">{formatCurrency(cart.services.reduce((s,i)=>s+effectivePrice(i),0) + cart.products.reduce((s,i)=>s+(i.price*i.quantity),0))}</span></div>
                                <div className="d-flex justify-content-between text-success"><strong>{t("total_to_pay_finished")}</strong><strong className="text-success">{formatCurrency(total)}</strong></div>
                                {tipAmountNum > 0 && (
                                    <div className="d-flex justify-content-between"><span>{t("tip_amount")}</span><span className="fw-medium">{formatCurrency(tipAmountNum)}</span></div>
                                )}
                                {tipAmountNum > 0 && (
                                    <div className="d-flex justify-content-between fw-bold"><span>{t("total_with_tip") || "Total con propina"}</span><span>{formatCurrency(totalWithTip)}</span></div>
                                )}
                                <hr className="my-2"/>
                                <div className="d-flex justify-content-between fs-5"><strong>{t("paid")}</strong><strong>{formatCurrency(paidTotal)}</strong></div>
                                {change > 0 && <div className="d-flex justify-content-between text-info"><span>{t("change")}</span><span>{formatCurrency(change)}</span></div>}
                                <div className="d-grid mt-3"><Button color="primary" size="lg" disabled={!canPay} onClick={handlePayNow}>{isProcessingPayment && <Spinner size="sm" className="me-2"/>}{t("pay_now")}</Button></div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
                )}
            </Container>

            <Modal isOpen={newClientModalOpen} toggle={() => setNewClientModalOpen(false)} centered>
                <ModalHeader toggle={() => setNewClientModalOpen(false)}>{t("create_new_client")}</ModalHeader>
                <ModalBody><p>...</p></ModalBody>
                <ModalFooter><Button color="light" onClick={() => setNewClientModalOpen(false)}>{t("cancel_appointment")}</Button><Button color="primary">{t("save_client")}</Button></ModalFooter>
            </Modal>
            
            <Modal isOpen={priceModalOpen} toggle={() => setPriceModalOpen(false)} centered>
                <ModalHeader toggle={() => setPriceModalOpen(false)}>
                    {t("edit_price") || "Editar precio"}{priceEditItem ? ` — ${priceEditItem.name}` : ""}
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Label className="form-label">{t("original_price") || "Precio del catalogo"}</Label>
                        <Input value={priceEditItem ? formatCurrency(priceEditItem.price) : ""} disabled />
                    </div>
                    <div className="mb-3">
                        <Label className="form-label">{t("new_price") || "Precio a cobrar"}</Label>
                        <CurrencyInput
                            className="form-control"
                            value={priceEditValue}
                            onValueChange={(value) => setPriceEditValue(value || "")}
                            prefix="$ " groupSeparator="." decimalSeparator=","
                        />
                    </div>
                    <div>
                        <Label className="form-label">{t("override_reason") || "Motivo"}</Label>
                        <Input
                            type="textarea"
                            rows={2}
                            maxLength={255}
                            value={priceEditReason}
                            onChange={(e) => setPriceEditReason(e.target.value)}
                            placeholder={t("override_reason_placeholder") || "Ej: solo se hizo flequillo, descuento por fidelidad..."}
                        />
                        <small className="text-muted">{t("override_reason_hint") || "Obligatorio si el precio cambia. Queda auditado."}</small>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setPriceModalOpen(false)}>{t("cancel_appointment")}</Button>
                    <Button color="primary" onClick={submitPriceOverride}>{t("save") || "Guardar"}</Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={resModalOpen} toggle={() => setResModalOpen(false)} centered>
                <ModalHeader toggle={() => setResModalOpen(false)}>{t("reschedule_appointment")} {resItem?.name}</ModalHeader>
                <ModalBody>
                    <Label>{t("new_date_time")}</Label>
                    <Flatpickr 
                        className="form-control" 
                        options={{enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today"}}
                        value={resDateTime} 
                        onChange={([date]) => setResDateTime(new Date(date).toISOString())} 
                    />
                </ModalBody>
                <ModalFooter>
                    <Button color="light" onClick={() => setResModalOpen(false)}>{t("cancel_appointment")}</Button>
                    <Button color="primary" onClick={submitReschedule}>{t("save")}</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default PointOfSale;