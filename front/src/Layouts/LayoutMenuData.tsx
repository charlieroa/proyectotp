// Archivo: src/Layouts/LayoutMenuData.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2';
import { getToken } from "../services/auth";

// --- Imports de Redux para LEER el estado ---
import { useSelector } from "react-redux";
import { selectIsSetupComplete, selectTenantPlan, isPlanAtLeast } from "../slices/Settings/settingsSlice";

// --- Helper para obtener el rol del usuario desde el token JWT ---
const getRoleFromToken = (): number | null => {
    try {
        const token = getToken();
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.role_id || null;
    } catch (e) {
        console.error("Error decodificando el token:", e);
        return null;
    }
};

// Nombres legibles de los planes
const PLAN_NAMES: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
};

const LayoutMenuData = () => {
    const history = useNavigate();
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    const userRole = getRoleFromToken();

    // Leemos el estado directamente desde Redux de forma reactiva
    const isSetupComplete = useSelector(selectIsSetupComplete);
    const tenantPlan = useSelector(selectTenantPlan);

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
    }, [iscurrentState]);

    // Helper to apply plan lock to an item
    const applyPlanLock = (item: any) => {
        const minPlan = item.minPlan || 'free';
        if (!isPlanAtLeast(tenantPlan, minPlan)) {
            return {
                ...item,
                disabled: true,
                badge: PLAN_NAMES[minPlan] || minPlan,
                badgeColor: 'warning',
                onClick: () => {
                    Swal.fire({
                        title: `Disponible en plan ${PLAN_NAMES[minPlan] || minPlan}`,
                        text: `Esta función requiere el plan ${PLAN_NAMES[minPlan] || minPlan} o superior. Ve a Configuración → Planes para actualizar.`,
                        icon: 'info',
                        confirmButtonText: 'Ver planes',
                        showCancelButton: true,
                        cancelButtonText: 'Cerrar',
                        confirmButtonColor: '#438eff'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            history('/settings?tab=6');
                        }
                    });
                }
            };
        }
        return item;
    };

    // Step 1: Build static menu structure (filtered by role + plan + setup) — memoized
    const filteredMenuItems = useMemo(() => {
        const menuItems: any[] = [
            { label: "Menú Principal", isHeader: true },
            { id: "dashboard", label: "Dashboard", icon: "ri-dashboard-2-line", link: "/dashboard", roles: [1, 2, 3, 6], minPlan: "free" },
            { id: "fichero", label: "Fichero", icon: "ri-list-ordered", link: "/fichero", roles: [1, 2], minPlan: "pro" },
            { id: "crm", label: "CRM", icon: "ri-user-heart-line", link: "/crm", roles: [1, 3], minPlan: "free" },
            { id: "messages", label: "Mensajes", icon: "ri-message-3-line", link: "/messages", roles: [1, 2, 6], minPlan: "business" },
            { id: "inventory", label: "Inventario", icon: "ri-archive-line", link: "/inventory", roles: [1], minPlan: "pro" },
            { id: "payroll", label: "Nómina", icon: "ri-money-dollar-circle-line", link: "/payroll", roles: [1], minPlan: "pro" },
            { id: "settings", label: "Configuración", icon: "ri-settings-3-line", link: "/settings", roles: [1], minPlan: "free" },
            // Super Admin (role 5)
            { label: "Super Admin", isHeader: true, roles: [5] },
            { id: "super-admin", label: "Panel Super Admin", icon: "ri-shield-star-line", link: "/super-admin", roles: [5] },
        ];

        if (!userRole) return [];

        const roleFiltered = menuItems.filter(item => {
            if (!item.roles) return true;
            return item.roles.includes(userRole);
        });

        // Super admin (role 5) no tiene restricciones
        if (userRole === 5) return roleFiltered;

        // Cajero (role 2), estilista (role 3) y cajera (role 6) no tienen restricción de setup, solo de plan
        const skipSetupCheck = userRole === 2 || userRole === 3 || userRole === 6;

        return roleFiltered.map(item => {
            if (item.isHeader || !item.id) return item;
            if (item.id === 'settings') return item;

            let processedItem = { ...item };

            // Process subItems for plan locks
            if (processedItem.subItems) {
                processedItem.subItems = processedItem.subItems.map((sub: any) => applyPlanLock(sub));
            }

            // Verificar restricción de plan para el item padre
            const minPlan = processedItem.minPlan || 'free';
            if (!isPlanAtLeast(tenantPlan, minPlan)) {
                return {
                    ...processedItem,
                    icon: 'ri-lock-line',
                    disabled: true,
                    subItems: undefined,
                    badge: PLAN_NAMES[minPlan] || minPlan,
                    badgeColor: 'warning',
                    onClick: () => {
                        Swal.fire({
                            title: `Disponible en plan ${PLAN_NAMES[minPlan] || minPlan}`,
                            text: `Esta función requiere el plan ${PLAN_NAMES[minPlan] || minPlan} o superior. Ve a Configuración → Planes para actualizar.`,
                            icon: 'info',
                            confirmButtonText: 'Ver planes',
                            showCancelButton: true,
                            cancelButtonText: 'Cerrar',
                            confirmButtonColor: '#438eff'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                history('/settings?tab=6');
                            }
                        });
                    }
                };
            }

            // Si setup no está completo, bloquear (solo para admin, rol 1)
            if (!skipSetupCheck && !isSetupComplete) {
                return {
                    ...processedItem,
                    icon: 'ri-lock-line',
                    disabled: true,
                    subItems: undefined,
                    onClick: () => {
                        Swal.fire({
                            title: 'Configuración Incompleta',
                            text: 'Tienes que configurar primero tu negocio para acceder a esta sección.',
                            icon: 'warning',
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#438eff'
                        });
                    }
                };
            }

            return processedItem;
        });
    }, [userRole, isSetupComplete, tenantPlan]);

    return <React.Fragment>{filteredMenuItems}</React.Fragment>;
};

export default LayoutMenuData;
