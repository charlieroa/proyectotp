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
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isEstilistas, setIsEstilistas] = useState<boolean>(false);
    const [isInventario, setIsInventario] = useState<boolean>(false);
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    const userRole = getRoleFromToken();

    // Leemos el estado directamente desde Redux de forma reactiva
    const isSetupComplete = useSelector(selectIsSetupComplete);
    const tenantPlan = useSelector(selectTenantPlan);

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
        if (iscurrentState !== "Dashboard") { setIsDashboard(false); }
        if (iscurrentState !== "Estilistas") { setIsEstilistas(false); }
        if (iscurrentState !== "Inventario") { setIsInventario(false); }
    }, [history, iscurrentState, isDashboard, isEstilistas, isInventario]);


    const menuItems: any[] = [
        { label: "Menú Principal", isHeader: true },
        { id: "ai-assistant", label: "Asistente IA", icon: "ri-sparkling-line", link: "/assistant", roles: [1, 2, 3], minPlan: "pro" },
        { id: "dashboard", label: "Dashboard", icon: "ri-dashboard-2-line", link: "/dashboard", roles: [1, 2, 3], minPlan: "free" },
        { id: "stylists", label: "Crm", icon: "ri-user-heart-line", link: "/stylists", roles: [1, 3], minPlan: "free" },
        { id: "inventory", label: "Inventario", icon: "ri-archive-line", link: "/inventory", roles: [1], minPlan: "pro" },
        { id: "payroll", label: "Nómina", icon: "ri-money-dollar-circle-line", link: "/payroll", roles: [1], minPlan: "pro" },
        { id: "settings", label: "Configuración", icon: "ri-settings-3-line", link: "/settings", roles: [1], minPlan: "free" },
     {
        id: "show-tour",
        label: "Mostrar Tour",
        icon: "ri-question-line",
        link: "#!",
        roles: [1],
        isAction: true,
        minPlan: "free"
    },
    // Super Admin (role 5)
    { label: "Super Admin", isHeader: true, roles: [5] },
    { id: "super-admin", label: "Panel Super Admin", icon: "ri-shield-star-line", link: "/super-admin", roles: [5] },
    ];

    // Filtramos y modificamos el menú
    const finalMenuItems = useMemo(() => {
        if (!userRole) return [];

        const roleFiltered = menuItems.filter(item => {
            if (!item.roles) return true;
            return item.roles.includes(userRole);
        });

        // Super admin (role 5) no tiene restricciones de plan ni setup
        if (userRole === 5) {
            return roleFiltered;
        }

        return roleFiltered.map(item => {
            // Headers y super admin items pasan sin cambio
            if (item.isHeader || !item.id) return item;

            // Settings siempre accesible
            if (item.id === 'settings') return item;

            // Verificar restricción de plan (tiene prioridad visual sobre setup)
            const minPlan = item.minPlan || 'free';
            if (!isPlanAtLeast(tenantPlan, minPlan)) {
                return {
                    ...item,
                    icon: 'ri-lock-line',
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

            // Si setup no está completo, bloquear items que no sean settings
            if (!isSetupComplete) {
                return {
                    ...item,
                    icon: 'ri-lock-line',
                    disabled: true,
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

            return item;
        });
    }, [userRole, isSetupComplete, tenantPlan]);

    return <React.Fragment>{finalMenuItems}</React.Fragment>;
};

export default LayoutMenuData;
