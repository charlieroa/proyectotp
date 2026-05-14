import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Spinner } from 'reactstrap';
import { useTranslation } from 'react-i18next';

// Importamos nuestros helpers de autenticación
import { getDecodedToken, logout, getRoleFromToken } from '../../services/auth';
import api, { getUploadsBaseUrl } from '../../services/api';
import { useCurrency } from '../../contexts/CurrencyContext';

// Imagen de fallback
import avatar1 from "../../assets/images/users/avatar-1.jpg";

const ProfileDropdown = ({ onChangeLayoutMode, layoutModeType, startTour }: any) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { formatCurrency } = useCurrency();
    const userRoleId = getRoleFromToken();

    const [user, setUser] = useState<any | null>(null);
    const [tenantLogo, setTenantLogo] = useState<string>(avatar1);
    const [cashSession, setCashSession] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isProfileDropdown, setIsProfileDropdown] = useState<boolean>(false);

    const roleMap: { [key: number]: string } = {
        1: t("role_admin"),
        2: t("role_cashier"),
        3: t("role_stylist"),
        5: t("role_super_admin")
    };

    const fetchProfileData = async () => {
        setLoading(true);
        const decodedToken = getDecodedToken();
        const userId = decodedToken?.user?.id;
        const tenantId = decodedToken?.user?.tenant_id;

        if (userId) {
            try {
                const userRes = await api.get(`/users/${userId}`);
                setUser(userRes.data);

                if (tenantId) {
                    const [tenantRes, cashRes] = await Promise.all([
                        api.get(`/tenants/${tenantId}`),
                        api.get('/cash/current')
                    ]);

                    if (tenantRes.data?.logo_url) {
                        const uploadsBase = getUploadsBaseUrl();
                        const logo = tenantRes.data.logo_url;
                        setTenantLogo(logo.startsWith('http') ? logo : `${uploadsBase}${logo}`);
                    }

                    setCashSession(cashRes.data);
                }
            } catch (error) {
                console.error("Error loading profile data:", error);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProfileData();

        const handleCashSessionChange = () => { fetchProfileData(); };
        const handleProfileUpdated = () => { fetchProfileData(); };

        window.addEventListener('cashSessionChanged', handleCashSessionChange);
        window.addEventListener('profileUpdated', handleProfileUpdated);

        return () => {
            window.removeEventListener('cashSessionChanged', handleCashSessionChange);
            window.removeEventListener('profileUpdated', handleProfileUpdated);
        };
    }, []);

    const userName = useMemo(() => user?.first_name || t("user"), [user, t]);
    const userRole = useMemo(() => user?.role_id, [user]);
    const roleName = useMemo(() => userRole ? roleMap[userRole] || t("user") : t("user"), [userRole, t]);
    const sessionBalance = useMemo(() => {
        if (!cashSession || !cashSession.summary?.incomes_by_payment_method) {
            return 0;
        }
        return cashSession.summary.incomes_by_payment_method.reduce((acc: number, item: any) => acc + parseFloat(item.total), 0);
    }, [cashSession]);

    const toggleProfileDropdown = () => { setIsProfileDropdown(!isProfileDropdown); };
    const handleLogout = () => { logout(); navigate("/login"); };

    const isDark = layoutModeType === "dark";

    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn shadow-none">
                    <span className="d-flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={tenantLogo} alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{loading ? <Spinner size="sm"/> : userName}</span>
                            <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">{roleName}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">{t("hello")}, {userName}!</h6>
                    <DropdownItem href="/Settings">
                        <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">{t("my_profile")}</span>
                    </DropdownItem>
                    <DropdownItem href="/Settings">
                        <i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">{t("settings")}</span>
                    </DropdownItem>

                    {/* Dark/Light Mode */}
                    {onChangeLayoutMode && (
                        <DropdownItem onClick={() => onChangeLayoutMode(isDark ? "light" : "dark")}>
                            <i className={`mdi ${isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'} text-muted fs-16 align-middle me-1`}></i>
                            <span className="align-middle">{isDark ? t("light_mode") : t("dark_mode")}</span>
                        </DropdownItem>
                    )}

                    {/* Tour — admin only */}
                    {userRoleId === 1 && startTour && (
                        <DropdownItem onClick={startTour}>
                            <i className="mdi mdi-help-circle-outline text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t("show_tour")}</span>
                        </DropdownItem>
                    )}

                    <div className="dropdown-divider"></div>
                    <DropdownItem href="#">
                        <i className="mdi mdi-wallet text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">
                            {t("balance")}: <b>
                                {loading ? <Spinner size="sm" /> :
                                 cashSession ? formatCurrency(sessionBalance)
                                             : t("cash_closed")
                                }
                            </b>
                        </span>
                    </DropdownItem>
                    <DropdownItem onClick={handleLogout}>
                        <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">{t("logout")}</span>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;
