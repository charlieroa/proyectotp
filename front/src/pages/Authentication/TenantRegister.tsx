// src/pages/Authentication/TenantRegister.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Spinner } from 'reactstrap';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from 'reselect';

import { registerTenant } from '../../slices/auth/tenantRegister/thunk';
import { resetTenantRegisterFlag } from '../../slices/auth/tenantRegister/reducer';
import { loginSuccess } from '../../slices/auth/login/reducer';
import { setToken } from '../../services/auth';
import logoLight from "../../assets/images/logo-light.png";

import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const TenantRegister = () => {
  const { t } = useTranslation();
  document.title = `${t("create_account")} | Tupelukeria`;

  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  const selectedPlan = useMemo(() => {
    const planKey = searchParams.get('plan');
    const plans: Record<string, { name: string; price: string; icon: string; color: string }> = {
      pro: { name: 'Pro', price: '$29.900 COP/mes', icon: '🚀', color: '#7c3aed' },
      business: { name: 'Business', price: '$49.900 COP/mes', icon: '🏢', color: '#06b6d4' },
      enterprise: { name: 'Enterprise', price: '$99.900 COP/mes', icon: '🌐', color: '#f59e0b' },
    };
    return planKey && plans[planKey] ? { key: planKey, ...plans[planKey] } : null;
  }, [searchParams]);

  const selectRegisterState = (state: any) => state.tenantRegister;
  const registerData = createSelector(
    selectRegisterState,
    (state) => ({
      success: state.registrationSuccess,
      error: state.registrationError,
    })
  );
  const { success, error } = useSelector(registerData);

  const validation = useFormik({
    initialValues: {
      tenantName: '',
      adminFirstName: '',
      adminEmail: '',
      adminPassword: '',
    },
    validationSchema: Yup.object({
      tenantName: Yup.string().required(t("enter_salon_name")),
      adminFirstName: Yup.string().required(t("enter_your_name")),
      adminEmail: Yup.string().required(t("enter_email")).email(t("invalid_email")),
      adminPassword: Yup.string().required(t("enter_password")).min(6, t("min_6_chars")),
    }),
    onSubmit: (values) => {
      const payload = {
        ...values,
        adminEmail: (values.adminEmail || '').trim().toLowerCase(),
      };
      setIsLoading(true);
      dispatch(registerTenant(payload));
    },
  });

  useEffect(() => {
    if (success) {
      setIsLoading(false);

      // Auto-login: the backend now returns a token
      if (success.token) {
        setToken(success.token);
        const authUser = {
          message: "Login Successful",
          token: success.token,
          user: success.user,
          setup_complete: false,
        };
        sessionStorage.setItem("authUser", JSON.stringify(authUser));
        localStorage.setItem("setupProgress", "0");
        dispatch(loginSuccess(authUser));
      }

      Swal.fire({
        icon: "success",
        title: t("account_created"),
        text: selectedPlan
          ? `${t("setting_up_salon")} — Plan ${selectedPlan.name} seleccionado`
          : t("setting_up_salon"),
        confirmButtonColor: "#7c3aed",
        background: "#0f172a",
        color: "#e2e8f0",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        dispatch(resetTenantRegisterFlag());
        if (selectedPlan) {
          navigate(`/settings?tab=6&activate=${selectedPlan.key}`);
        } else {
          navigate('/assistant');
        }
      });
    }
    if (error) {
      setIsLoading(false);
      Swal.fire({
        icon: "error",
        title: t("registration_error"),
        text: typeof error === 'string' ? error : t("try_again"),
        confirmButtonText: t("got_it"),
        confirmButtonColor: "#7c3aed",
        background: "#0f172a",
        color: "#e2e8f0",
      }).then(() => {
        dispatch(resetTenantRegisterFlag());
      });
    }
  }, [success, error, dispatch, navigate]);

  const inputStyle = (fieldName: string) => ({
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(2, 6, 23, 0.8)',
    border: (validation.touched as any)[fieldName] && (validation.errors as any)[fieldName]
      ? '1px solid #ef4444'
      : '1px solid rgba(100, 116, 139, 0.3)',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Inter", sans-serif',
    }}>
      {/* Grid pattern background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundSize: '40px 40px',
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, black 50%, transparent 90%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Animated blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '30%',
        width: '400px',
        height: '400px',
        background: 'rgba(124, 58, 237, 0.25)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        animation: 'blob 10s infinite',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '350px',
        height: '350px',
        background: 'rgba(34, 211, 238, 0.15)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        animation: 'blob 10s infinite reverse',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '440px',
        padding: '0 20px',
      }}>
        {/* Logo centrado */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <img
              src={logoLight}
              alt="Tupelukeria"
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              style={{
                height: '70px',
                display: 'block',
                transition: 'filter 250ms ease',
                filter: logoHover
                  ? 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.5))'
                  : 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))',
              }}
            />
          </Link>
          <p style={{
            marginTop: '10px',
            fontSize: '13px',
            color: '#94a3b8',
            fontWeight: 400,
          }}>
            {t("register_salon_tagline")}
          </p>
        </div>

        {/* Tabs Login / Registro */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(100, 116, 139, 0.2)',
        }}>
          <div
            onClick={() => navigate('/login')}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '12px 0',
              borderRadius: '12px',
              background: 'transparent',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            {t("sign_in")}
          </div>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '12px 0',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'default',
            boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
          }}>
            {t("create_account")}
          </div>
        </div>

        {/* Plan seleccionado desde landing */}
        {selectedPlan && (
          <div style={{
            background: `linear-gradient(135deg, ${selectedPlan.color}22, ${selectedPlan.color}11)`,
            border: `1px solid ${selectedPlan.color}44`,
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '28px' }}>{selectedPlan.icon}</span>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>
                Plan {selectedPlan.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                {selectedPlan.price} — {t("register_to_activate") || "Regístrate para activar tu plan"}
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.3))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 4px 40px rgba(0, 0, 0, 0.5)',
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading) validation.handleSubmit();
            }}
          >
            {/* Nombre de la Peluquería */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '8px',
              }}>
                {t("salon_name")}
              </label>
              <input
                name="tenantName"
                type="text"
                placeholder={t("enter_salon_name")}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.tenantName}
                style={inputStyle('tenantName')}
                onFocus={(e) => {
                  if (!(validation.touched.tenantName && validation.errors.tenantName)) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }
                }}
                onBlurCapture={(e) => {
                  if (!(validation.touched.tenantName && validation.errors.tenantName)) {
                    e.target.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                  }
                }}
              />
              {validation.touched.tenantName && validation.errors.tenantName && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.tenantName}
                </p>
              )}
            </div>

            {/* Tu Nombre */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '8px',
              }}>
                {t("your_name")}
              </label>
              <input
                name="adminFirstName"
                type="text"
                placeholder={t("enter_your_name")}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.adminFirstName}
                style={inputStyle('adminFirstName')}
                onFocus={(e) => {
                  if (!(validation.touched.adminFirstName && validation.errors.adminFirstName)) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }
                }}
                onBlurCapture={(e) => {
                  if (!(validation.touched.adminFirstName && validation.errors.adminFirstName)) {
                    e.target.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                  }
                }}
              />
              {validation.touched.adminFirstName && validation.errors.adminFirstName && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.adminFirstName}
                </p>
              )}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '8px',
              }}>
                {t("email")}
              </label>
              <input
                name="adminEmail"
                type="email"
                placeholder={t("your_email")}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.adminEmail}
                style={inputStyle('adminEmail')}
                onFocus={(e) => {
                  if (!(validation.touched.adminEmail && validation.errors.adminEmail)) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }
                }}
                onBlurCapture={(e) => {
                  if (!(validation.touched.adminEmail && validation.errors.adminEmail)) {
                    e.target.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                  }
                }}
              />
              {validation.touched.adminEmail && validation.errors.adminEmail && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.adminEmail}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '8px',
              }}>
                {t("password")}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("min_6_chars")}
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.adminPassword}
                  style={{
                    ...inputStyle('adminPassword'),
                    paddingRight: '48px',
                  }}
                  onFocus={(e) => {
                    if (!(validation.touched.adminPassword && validation.errors.adminPassword)) {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    }
                  }}
                  onBlurCapture={(e) => {
                    if (!(validation.touched.adminPassword && validation.errors.adminPassword)) {
                      e.target.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                  }}
                >
                  {showPassword ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
                </button>
              </div>
              {validation.touched.adminPassword && validation.errors.adminPassword && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.adminPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: '14px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading && <Spinner size="sm" />}
              {t("create_my_account")}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '11px', color: '#334155', fontFamily: 'monospace' }}>
            &copy; 2026 TUPELUKERIA SYSTEMS
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        ::placeholder {
          color: #475569 !important;
        }
      `}</style>
    </div>
  );
};

export default TenantRegister;
