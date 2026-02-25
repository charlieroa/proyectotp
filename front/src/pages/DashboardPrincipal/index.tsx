import React, { useState, useEffect } from 'react';
import { Container, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import { Navigate } from 'react-router-dom';
import classnames from 'classnames';

// Importamos los componentes que actuarán como el contenido de nuestras pestañas
import AIAssistant from '../AIAssistant';
import Calendar from '../Calendar';
import Geolocalizacion from '../Geolocalizacion';
import ReportesYFichero from '../ReportesYFichero';
import SuperCalendar from './SuperCalendar';
import { getRoleFromToken } from '../../services/auth';
import { api } from '../../services/api';

// Interfaz vacía para mantener la estructura de TypeScript, aunque no recibimos props.
interface IProps { }

const DashboardPrincipal: React.FC<IProps> = () => {
    document.title = "Dashboard | Sistema de Peluquerías";

    // Estado para controlar qué pestaña está activa — Asistente IA es la primera
    const [activeTab, setActiveTab] = useState<string>('1');
    const [hasBranches, setHasBranches] = useState<boolean>(false);

    const toggleTab = (tab: string) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    useEffect(() => {
        const checkBranches = async () => {
            try {
                const { data } = await api.get('/tenants/my-businesses');
                if (Array.isArray(data) && data.length > 1) {
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

    return (
        <React.Fragment>
            {/* Contenedor principal con la clase de anulación para eliminar el padding */}
            <div className="page-content page-content-flush">
                <Container fluid>
                    {/* El sistema de Pestañas (Tabs) */}
                    <Nav tabs className="nav-tabs-custom nav-success mb-3">
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '1' })}
                                onClick={() => { toggleTab('1'); }}
                            >
                                <i className="ri-sparkling-line me-1"></i> Asistente IA
                            </NavLink>
                        </NavItem>
                        {hasBranches && (
                            <NavItem>
                                <NavLink
                                    style={{ cursor: "pointer" }}
                                    className={classnames({ active: activeTab === '5' })}
                                    onClick={() => { toggleTab('5'); }}
                                >
                                    <i className="ri-calendar-todo-line me-1"></i> Supercalendario
                                </NavLink>
                            </NavItem>
                        )}
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '2' })}
                                onClick={() => { toggleTab('2'); }}
                            >
                                <i className="ri-calendar-2-line me-1"></i> Calendario y Caja
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '3' })}
                                onClick={() => { toggleTab('3'); }}
                            >
                                <i className="ri-map-pin-user-line me-1"></i> Geolocalización
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '4' })}
                                onClick={() => { toggleTab('4'); }}
                            >
                                <i className="ri-file-list-3-line me-1"></i> Reportes y Fichero
                            </NavLink>
                        </NavItem>
                    </Nav>

                    {/* El contenido de las pestañas */}
                    <TabContent activeTab={activeTab} className="text-muted">
                        <TabPane tabId="1">
                            <AIAssistant />
                        </TabPane>
                        {hasBranches && (
                            <TabPane tabId="5">
                                <SuperCalendar />
                            </TabPane>
                        )}
                        <TabPane tabId="2">
                            <Calendar />
                        </TabPane>
                        <TabPane tabId="3">
                            <Geolocalizacion />
                        </TabPane>
                        <TabPane tabId="4">
                            <ReportesYFichero />
                        </TabPane>
                    </TabContent>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardPrincipal;
