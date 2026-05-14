import React, { useState, useEffect } from 'react';
import { Container, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';

// Importamos los componentes que actuarán como el contenido de nuestras pestañas
import AIAssistant from '../AIAssistant';
import Calendar from '../Calendar';
import Geolocalizacion from '../Geolocalizacion';
import ReportesYFichero from '../ReportesYFichero';
import SuperCalendar from './SuperCalendar';
import MovimientosCaja from './MovimientosCaja';
import { getRoleFromToken, getIsPrimaryBranch } from '../../services/auth';
import { api } from '../../services/api';
import { selectTenantPlan, isPlanAtLeast } from '../../slices/Settings/settingsSlice';

// Interfaz vacía para mantener la estructura de TypeScript, aunque no recibimos props.
interface IProps { }

const DashboardPrincipal: React.FC<IProps> = () => {
    const { t } = useTranslation();
    document.title = t("menu_dashboard") + " | " + t("page_title");
    const navigate = useNavigate();

    // Estado para controlar qué pestaña está activa
    const [activeTab, setActiveTab] = useState<string>('2'); // Calendar por defecto. Tab 1 (asistente IA) removido — ahora en el header.
    const [hasBranches, setHasBranches] = useState<boolean>(false);
    const tenantPlan = useSelector(selectTenantPlan);
    const canAccessAdvanced = isPlanAtLeast(tenantPlan, 'pro');

    const toggleTab = (tab: string) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    const handleLockedTab = () => {
        Swal.fire({
            title: t("available_in_plan", { plan: "Pro" }),
            text: t("requires_plan", { plan: "Pro" }),
            icon: 'info',
            confirmButtonText: t("view_plans"),
            showCancelButton: true,
            cancelButtonText: t("close"),
            confirmButtonColor: '#438eff'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/settings?tab=6');
            }
        });
    };

    useEffect(() => {
        const checkBranches = async () => {
            try {
                const { data } = await api.get('/tenants/my-businesses');
                if (Array.isArray(data) && data.length >= 1) {
                    setHasBranches(true);
                }
            } catch { /* ignore */ }
        };
        checkBranches();
    }, []);

    // Super admin should never see the regular dashboard
    if (getRoleFromToken() === 5) {
        return <Navigate to="/super-admin" replace />;
    }

    const userRole = getRoleFromToken();
    const isCajero = userRole === 2;
    const isRecepcionista = userRole === 6;
    const isRestricted = isCajero || isRecepcionista;
    const isPrimary = getIsPrimaryBranch();

    return (
        <React.Fragment>
            {/* Contenedor principal con la clase de anulación para eliminar el padding */}
            <div className="page-content page-content-flush">
                <Container fluid>
                    {/* El sistema de Pestañas (Tabs) */}
                    <Nav tabs className="nav-tabs-custom nav-success mb-3">
                        {/* Asistente IA movido al header → botón "Hablar con IA" abre offcanvas */}
                        {hasBranches && !isRestricted && isPrimary && (
                            <NavItem>
                                <NavLink
                                    style={{ cursor: "pointer" }}
                                    className={classnames({ active: activeTab === '5' })}
                                    onClick={() => { toggleTab('5'); }}
                                >
                                    <i className="ri-calendar-todo-line me-1"></i> {t("tab_super_calendar")}
                                </NavLink>
                            </NavItem>
                        )}
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '2' })}
                                onClick={() => { toggleTab('2'); }}
                            >
                                <i className="ri-calendar-2-line me-1"></i> {t("tab_calendar_cash")}
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '6' })}
                                onClick={() => { toggleTab('6'); }}
                            >
                                <i className="ri-money-dollar-box-line me-1"></i> {t("tab_cash_movements")}
                            </NavLink>
                        </NavItem>
                        {!isRestricted && (
                            <NavItem>
                                <NavLink
                                    style={{ cursor: canAccessAdvanced ? "pointer" : "not-allowed" }}
                                    className={classnames({ active: activeTab === '3', disabled: !canAccessAdvanced })}
                                    onClick={() => { canAccessAdvanced ? toggleTab('3') : handleLockedTab(); }}
                                >
                                    {!canAccessAdvanced && <i className="ri-lock-line text-muted me-1"></i>}
                                    <i className="ri-map-pin-user-line me-1"></i> {t("tab_geolocation")}
                                    {!canAccessAdvanced && <span className="badge bg-warning-subtle text-warning rounded-pill ms-1">Pro</span>}
                                </NavLink>
                            </NavItem>
                        )}
                        {!isRestricted && (
                            <NavItem>
                                <NavLink
                                    style={{ cursor: canAccessAdvanced ? "pointer" : "not-allowed" }}
                                    className={classnames({ active: activeTab === '4', disabled: !canAccessAdvanced })}
                                    onClick={() => { canAccessAdvanced ? toggleTab('4') : handleLockedTab(); }}
                                >
                                    {!canAccessAdvanced && <i className="ri-lock-line text-muted me-1"></i>}
                                    <i className="ri-file-list-3-line me-1"></i> {t("tab_reports_file")}
                                    {!canAccessAdvanced && <span className="badge bg-warning-subtle text-warning rounded-pill ms-1">Pro</span>}
                                </NavLink>
                            </NavItem>
                        )}
                    </Nav>

                    {/* El contenido de las pestañas */}
                    <TabContent activeTab={activeTab} className="text-muted">
                        {/* TabPane "1" del asistente IA removido — ahora vive en el header */}
                        {hasBranches && !isRestricted && isPrimary && (
                            <TabPane tabId="5">
                                <SuperCalendar />
                            </TabPane>
                        )}
                        <TabPane tabId="2">
                            <Calendar />
                        </TabPane>
                        <TabPane tabId="6">
                            <MovimientosCaja />
                        </TabPane>
                        {canAccessAdvanced && !isRestricted && (
                            <TabPane tabId="3">
                                <Geolocalizacion />
                            </TabPane>
                        )}
                        {canAccessAdvanced && !isRestricted && (
                            <TabPane tabId="4">
                                <ReportesYFichero />
                            </TabPane>
                        )}
                    </TabContent>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardPrincipal;
