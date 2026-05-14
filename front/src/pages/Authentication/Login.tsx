// src/pages/Authentication/Login.tsx
import React, { useEffect, useState } from 'react';
import { Spinner } from 'reactstrap';

import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";

import * as Yup from "yup";
import { useFormik } from "formik";

import { loginUser, socialLogin, resetLoginFlag } from "../../slices/thunks";
import logoLight from "../../assets/images/logo-light.png";
import { createSelector } from 'reselect';

import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const Login = (props: any) => {
  const { t } = useTranslation();
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const selectLayoutState = (state: any) => state;
  const loginpageData = createSelector(
    selectLayoutState,
    (state) => ({
      user: state.Account?.user,
      error: state.Login?.error,
      errorMsg: state.Login?.errorMsg,
    })
  );

  const { user, error, errorMsg } = useSelector(loginpageData);

  const [userLogin, setUserLogin] = useState<any>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const [logoHover, setLogoHover] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      const updatedUserData =
        process.env.REACT_APP_DEFAULTAUTH === "firebase"
          ? user.multiFactor?.user?.email
          : user.user?.email;
      const updatedUserPassword =
        process.env.REACT_APP_DEFAULTAUTH === "firebase" ? "" : user.user?.confirm_password;

      setUserLogin({
        email: updatedUserData || "",
        password: updatedUserPassword || "",
      });
    }
  }, [user]);

  const validation: any = useFormik({
    enableReinitialize: true,
    initialValues: {
      email: userLogin.email,
      password: userLogin.password,
    },
    validationSchema: Yup.object({
      email: Yup.string().required(t("enter_email")),
      password: Yup.string().required(t("enter_password")),
    }),
    onSubmit: (values) => {
      setLoader(true);
      dispatch(loginUser(values, props.router.navigate));
    },
  });

  const signIn = (type: any) => {
    dispatch(socialLogin(type, props.router.navigate));
  };

  useEffect(() => {
    if (errorMsg || error) {
      const messageRaw = (error || "").toString();
      Swal.fire({
        icon: "error",
        title: t("invalid_credentials"),
        text: messageRaw?.trim() || t("check_credentials"),
        confirmButtonText: t("got_it"),
        confirmButtonColor: "#7c3aed",
        background: "#0f172a",
        color: "#e2e8f0",
      }).finally(() => {
        setLoader(false);
        dispatch(resetLoginFlag());
      });
    }
  }, [dispatch, errorMsg, error]);

  document.title = `${t("sign_in")} | Tupelukeria`;

  const inputStyle = (touched: boolean, hasError: boolean) => ({
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(2, 6, 23, 0.8)',
    border: touched && hasError
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
            {t("ai_tagline")}
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
            {t("sign_in")}
          </div>
          <div
            onClick={() => navigate('/register-tenant')}
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
            {t("create_account")}
          </div>
        </div>

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
              validation.handleSubmit();
              return false;
            }}
          >
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
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
                name="email"
                type="email"
                placeholder={t("your_email")}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.email || ""}
                style={inputStyle(validation.touched.email, !!validation.errors.email)}
                onFocus={(e) => {
                  if (!(validation.touched.email && validation.errors.email)) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }
                }}
                onBlurCapture={(e) => {
                  if (!(validation.touched.email && validation.errors.email)) {
                    e.target.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                  }
                }}
              />
              {validation.touched.email && validation.errors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#94a3b8',
                }}>
                  {t("password")}
                </label>
                <Link to="/forgot-password" style={{
                  fontSize: '12px',
                  color: '#8b5cf6',
                  textDecoration: 'none',
                }}>
                  {t("forgot_password")}
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("enter_password")}
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.password || ""}
                  style={{
                    ...inputStyle(validation.touched.password, !!validation.errors.password),
                    paddingRight: '48px',
                  }}
                  onFocus={(e) => {
                    if (!(validation.touched.password && validation.errors.password)) {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    }
                  }}
                  onBlurCapture={(e) => {
                    if (!(validation.touched.password && validation.errors.password)) {
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
              {validation.touched.password && validation.errors.password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  {validation.errors.password}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <input
                type="checkbox"
                id="remember-check"
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#8b5cf6',
                  cursor: 'pointer',
                }}
              />
              <label htmlFor="remember-check" style={{
                fontSize: '13px',
                color: '#94a3b8',
                cursor: 'pointer',
              }}>
                {t("remember_me")}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loader}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: '14px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loader ? 'not-allowed' : 'pointer',
                opacity: loader ? 0.7 : 1,
                transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loader && <Spinner size="sm" />}
              {t("sign_in")}
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

export default withRouter(Login);
