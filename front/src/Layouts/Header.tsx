import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, DropdownMenu, DropdownToggle, Form, Offcanvas, OffcanvasBody, OffcanvasHeader } from 'reactstrap';
import AgendaRapida from '../Components/Calendar/AgendaRapida';
import TicketsModal from '../Components/Tickets/TicketsModal';
import AIAssistant from '../pages/AIAssistant';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

//import images
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//import Components
import SearchOption from '../Components/Common/SearchOption';
import LanguageDropdown from '../Components/Common/LanguageDropdown';
import WebAppsDropdown from '../Components/Common/WebAppsDropdown';
import MyCartDropdown from '../Components/Common/MyCartDropdown';
import FullScreenDropdown from '../Components/Common/FullScreenDropdown';
import NotificationDropdown from '../Components/Common/NotificationDropdown';
import ProfileDropdown from '../Components/Common/ProfileDropdown';
import { changeSidebarVisibility } from '../slices/thunks';
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from 'reselect';
import { getRoleFromToken } from '../services/auth';

const Header = ({ onChangeLayoutMode, layoutModeType, headerClass, startTour }: any) => {
    const dispatch: any = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const userRole = getRoleFromToken();

    // Subscription status badge
    const [subStatus, setSubStatus] = useState<{ plan: string; status: string; period_end: string | null } | null>(null);
    useEffect(() => {
        if (userRole && [1, 2].includes(userRole)) {
            api.get('/stripe/subscription-status').then(({ data }) => {
                if (data.plan && data.plan !== 'free') setSubStatus({ plan: data.plan, status: data.subscription_status, period_end: data.current_period_end });
                else if (data.plan === 'free') setSubStatus({ plan: 'free', status: 'none', period_end: null });
            }).catch(() => {});
        }
    }, [userRole]);

    // Feature flag: ticket virtual. Se refetchea en cada cambio de ruta + al evento
    // 'profileUpdated' que Settings dispara al guardar → el botón aparece/desaparece
    // al instante sin necesidad de recargar.
    const [ticketVirtualEnabled, setTicketVirtualEnabled] = useState<boolean>(false);
    useEffect(() => {
        if (!userRole || ![1, 2, 6].includes(userRole)) return;

        const fetchFlag = () => {
            api.get('/tenants/my-businesses')
                .then(({ data }) => {
                    const tenant = Array.isArray(data) && data[0];
                    setTicketVirtualEnabled(!!tenant?.ticket_virtual_enabled);
                })
                .catch(() => {});
        };

        fetchFlag();
        window.addEventListener('profileUpdated', fetchFlag);
        return () => window.removeEventListener('profileUpdated', fetchFlag);
    }, [userRole, location.pathname]);

    const selectDashboardData = createSelector(
        (state: any) => state.Layout,
        (layout) => layout.sidebarVisibilitytype // Corregido para seleccionar la propiedad correcta
    );
    const sidebarVisibilitytype = useSelector(selectDashboardData);

    const [search, setSearch] = useState<boolean>(false);
    const [agendaRapidaOpen, setAgendaRapidaOpen] = useState<boolean>(false);
    const [ticketsModalOpen, setTicketsModalOpen] = useState<boolean>(false);
    const [aiOpen, setAiOpen] = useState<boolean>(false);
    // Roles that can use quick agenda: Admin(1), Owner(2 - cashier), Receptionist(6)
    const canUseAgendaRapida = userRole && [1, 2, 3, 6].includes(userRole);
    const toogleSearch = () => {
        setSearch(!search);
    };

    const toogleMenuBtn = () => {
        var windowSize = document.documentElement.clientWidth;
        const humberIcon = document.querySelector(".hamburger-icon") as HTMLElement;
        dispatch(changeSidebarVisibility("show"));

        if (windowSize > 767)
            humberIcon.classList.toggle('open');

        //For collapse horizontal menu
        if (document.documentElement.getAttribute('data-layout') === "horizontal") {
            document.body.classList.contains("menu") ? document.body.classList.remove("menu") : document.body.classList.add("menu");
        }

        //For collapse vertical and semibox menu
        if (sidebarVisibilitytype === "show" && (document.documentElement.getAttribute('data-layout') === "vertical" || document.documentElement.getAttribute('data-layout') === "semibox")) {
            if (windowSize < 1025 && windowSize > 767) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'sm') ? document.documentElement.setAttribute('data-sidebar-size', '') : document.documentElement.setAttribute('data-sidebar-size', 'sm');
            } else if (windowSize > 1025) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'lg') ? document.documentElement.setAttribute('data-sidebar-size', 'sm') : document.documentElement.setAttribute('data-sidebar-size', 'lg');
            } else if (windowSize <= 767) {
                document.body.classList.add('vertical-sidebar-enable');
                document.documentElement.setAttribute('data-sidebar-size', 'lg');
            }
        }

        //Two column menu
        if (document.documentElement.getAttribute('data-layout') === "twocolumn") {
            document.body.classList.contains('twocolumn-panel') ? document.body.classList.remove('twocolumn-panel') : document.body.classList.add('twocolumn-panel');
        }
    };

    return (
        <React.Fragment>
            <header id="page-topbar" className={headerClass}>
                <div className="layout-width">
                    <div className="navbar-header">
                        <div className="d-flex">

                            <div className="navbar-brand-box horizontal-logo">
                                <Link to="/" className="logo logo-dark">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoDark} alt="" height="150" />
                                    </span>
                                </Link>

                                <Link to="/" className="logo logo-light">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoLight} alt="" height="150" />
                                    </span>
                                </Link>
                            </div>

                            <button
                                onClick={toogleMenuBtn}
                                type="button"
                                className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger shadow-none"
                                id="topnav-hamburger-icon">
                                <span className="hamburger-icon">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </span>
                            </button>

                            <SearchOption />
                        </div>

                        <div className="d-flex align-items-center">

                            <Dropdown isOpen={search} toggle={toogleSearch} className="d-md-none topbar-head-dropdown header-item">
                                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                                    <i className="bx bx-search fs-22"></i>
                                </DropdownToggle>
                                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0">
                                    <Form className="p-3">
                                        <div className="form-group m-0">
                                            <div className="input-group">
                                                <input type="text" className="form-control" placeholder="Search ..."
                                                    aria-label="Recipient's username" />
                                                <button className="btn btn-primary" type="submit"><i
                                                    className="mdi mdi-magnify"></i></button>
                                            </div>
                                        </div>
                                    </Form>
                                </DropdownMenu>
                            </Dropdown>

                            {/*
                                Acción primaria del topbar:
                                - Si el flag ticket_virtual está ON → botón azul "Ticket" (walk-ins)
                                - Si está OFF → botón verde "Agenda Rápida" (crear cita)
                                Solo visible para roles 1 (admin), 2 (owner/cajera), 3 (estilista), 6 (recep).
                            */}
                            {canUseAgendaRapida && ticketVirtualEnabled && [1, 2, 6].includes(userRole as number) ? (
                                <>
                                    <style>{`
                                        @keyframes ticketPulseBorder {
                                            0%   { box-shadow: 0 0 0 0 rgba(64,129,255,0.55), 0 2px 6px rgba(64,129,255,0.35); }
                                            70%  { box-shadow: 0 0 0 6px rgba(64,129,255,0),   0 2px 6px rgba(64,129,255,0.35); }
                                            100% { box-shadow: 0 0 0 0 rgba(64,129,255,0),     0 2px 6px rgba(64,129,255,0.35); }
                                        }
                                        .ticket-topbar-btn {
                                            background: linear-gradient(135deg, #4081ff 0%, #2d5fd1 100%);
                                            color: #fff;
                                            border: 1.5px solid rgba(255,255,255,0.35);
                                            border-radius: 20px;
                                            font-size: 13px;
                                            font-weight: 600;
                                            padding: 5px 14px;
                                            animation: ticketPulseBorder 2.2s ease-out infinite;
                                            transition: transform 0.15s ease;
                                        }
                                        .ticket-topbar-btn:hover {
                                            transform: translateY(-1px);
                                            color: #fff;
                                        }
                                    `}</style>
                                    <button
                                        type="button"
                                        className="btn btn-sm d-flex align-items-center gap-1 me-1 ticket-topbar-btn"
                                        onClick={() => setTicketsModalOpen(true)}
                                        title="Ticket Virtual (walk-in)"
                                    >
                                        <i className="ri-bill-line"></i>
                                        <span className="d-none d-sm-inline">Ticket Virtual</span>
                                    </button>
                                </>
                            ) : canUseAgendaRapida && (
                                <button
                                    type="button"
                                    className="btn btn-sm d-flex align-items-center gap-1 me-1"
                                    onClick={() => setAgendaRapidaOpen(true)}
                                    title="Agenda Rápida"
                                    style={{
                                        background: 'linear-gradient(135deg, #0ab39c 0%, #099885 100%)',
                                        color: '#fff',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        padding: '5px 14px',
                                        border: 'none',
                                        boxShadow: '0 2px 4px rgba(10,179,156,0.3)',
                                    }}
                                >
                                    <i className="ri-flashlight-line"></i>
                                    <span className="d-none d-sm-inline">Agenda Rápida</span>
                                </button>
                            )}

                            {/* Hablar con IA — abre offcanvas con AIAssistant */}
                            {[1].includes(userRole as number) && (
                                <button
                                    type="button"
                                    className="btn btn-sm d-flex align-items-center gap-1 me-1"
                                    onClick={() => setAiOpen(true)}
                                    title="Hablar con IA"
                                    style={{
                                        background: 'linear-gradient(135deg, #6f42c1 0%, #4527a0 100%)',
                                        color: '#fff',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        padding: '5px 14px',
                                        border: '1.5px solid rgba(255,255,255,0.35)',
                                    }}
                                >
                                    <i className="ri-sparkling-line" style={{ color: '#fde047' }}></i>
                                    <span className="d-none d-sm-inline">Hablar con IA</span>
                                </button>
                            )}

                            {/* FullScreenDropdown */}
                            <FullScreenDropdown />

                            {/* Language / Currency switcher */}
                            <LanguageDropdown />

                            {/* NotificationDropdown for real-time appointment notifications */}
                            <NotificationDropdown />

                            {/* ProfileDropdown — includes Dark Mode, Tour, Balance, Logout */}
                            <ProfileDropdown
                                onChangeLayoutMode={onChangeLayoutMode}
                                layoutModeType={layoutModeType}
                                startTour={startTour}
                            />
                        </div>
                    </div>
                </div>
            </header>
            {canUseAgendaRapida && (
                <AgendaRapida
                    isOpen={agendaRapidaOpen}
                    onClose={() => setAgendaRapidaOpen(false)}
                />
            )}
            {ticketVirtualEnabled && userRole && [1, 2, 6].includes(userRole) && (
                <TicketsModal
                    isOpen={ticketsModalOpen}
                    onClose={() => setTicketsModalOpen(false)}
                />
            )}
            {[1].includes(userRole as number) && (
                <Offcanvas
                    isOpen={aiOpen}
                    toggle={() => setAiOpen(false)}
                    direction="end"
                    style={{ width: 'min(900px, 100vw)' }}
                >
                    <OffcanvasHeader toggle={() => setAiOpen(false)} className="border-bottom">
                        <span style={{ fontWeight: 600 }}>
                            <i className="ri-sparkling-line text-warning me-2" />Hablar con IA
                        </span>
                    </OffcanvasHeader>
                    <OffcanvasBody className="p-0" style={{ overflowY: 'auto' }}>
                        {aiOpen && <AIAssistant />}
                    </OffcanvasBody>
                </Offcanvas>
            )}
        </React.Fragment>
    );
};

export default Header;