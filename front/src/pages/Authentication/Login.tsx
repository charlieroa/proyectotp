// src/pages/Authentication/Login.tsx — rediseño "Luxe claro" (coherente con /v2 y la landing).
import React, { useEffect, useState } from 'react';
import { Spinner } from 'reactstrap';

import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";

import * as Yup from "yup";
import { useFormik } from "formik";

import { loginUser, socialLogin, resetLoginFlag } from "../../slices/thunks";
import { createSelector } from 'reselect';

import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

import { T, FONT, V2_THEME_CSS } from "../V2/theme";

const BrandMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-12H12z" /></svg>
  </div>
);

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
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("v2-theme") === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-v2-theme", dark ? "dark" : "light");
    localStorage.setItem("v2-theme", dark ? "dark" : "light");
  }, [dark]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        confirmButtonColor: "#15171c",
        background: dark ? "#171a1f" : "#ffffff",
        color: dark ? "#f2f3f1" : "#15171c",
      }).finally(() => {
        setLoader(false);
        dispatch(resetLoginFlag());
      });
    }
  }, [dispatch, errorMsg, error]);

  document.title = `${t("sign_in")} | Tupelukeria`;

  const inputStyle = (touched: boolean, hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '13px 15px',
    background: T.surface2,
    border: touched && hasError ? `1px solid ${T.red}` : `1px solid ${T.border}`,
    borderRadius: 12,
    color: T.text,
    fontSize: 14,
    fontFamily: FONT,
    outline: 'none',
    transition: 'border-color .15s',
    boxSizing: 'border-box',
  });

  return (
    <div className="lx-login" style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{V2_THEME_CSS}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .lx-login ::placeholder{color:var(--v2-faint)}
        .lx-login input:-webkit-autofill{-webkit-text-fill-color:var(--v2-text);transition:background-color 5000s}
      `}</style>

      {/* glow verde superior (igual que la landing) */}
      <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 760, height: 380, background: 'radial-gradient(closest-side,rgba(20,160,90,.13),transparent)', pointerEvents: 'none', zIndex: 0 }} />

      {/* toggle claro/oscuro */}
      <button onClick={() => setDark((d) => !d)} title={dark ? "Modo claro" : "Modo oscuro"} style={{ position: 'absolute', top: 20, right: 22, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: T.surface, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 12, cursor: 'pointer' }}>
        {dark
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.3" /><path d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" /></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>}
      </button>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 430, padding: '0 20px' }}>
        {/* Marca */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <BrandMark />
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.5px', color: T.text }}>
              tupelukeria<span style={{ color: T.dim, fontWeight: 600 }}>.com</span>
            </span>
          </Link>
          <p style={{ marginTop: 12, fontSize: 13.5, color: T.muted, fontWeight: 500 }}>{t("ai_tagline")}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: T.surface, borderRadius: 14, padding: 4, marginBottom: 18, border: `1px solid ${T.border}` }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 10, background: T.ink, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'default' }}>
            {t("sign_in")}
          </div>
          <div
            onClick={() => navigate('/register-tenant')}
            style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 10, background: 'transparent', color: T.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {t("create_account")}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 24, padding: 30, boxShadow: '0 20px 50px rgba(0,0,0,.07)' }}>
          <form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); return false; }}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 7 }}>{t("email")}</label>
              <input
                name="email"
                type="email"
                placeholder={t("your_email")}
                onChange={validation.handleChange}
                onBlur={validation.handleBlur}
                value={validation.values.email || ""}
                style={inputStyle(validation.touched.email, !!validation.errors.email)}
                onFocus={(e) => { if (!(validation.touched.email && validation.errors.email)) e.target.style.borderColor = T.green; }}
                onBlurCapture={(e) => { if (!(validation.touched.email && validation.errors.email)) e.target.style.borderColor = T.border; }}
              />
              {validation.touched.email && validation.errors.email && (
                <p style={{ color: T.red, fontSize: 12, marginTop: 6 }}>{validation.errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>{t("password")}</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: T.green, textDecoration: 'none', fontWeight: 600 }}>{t("forgot_password")}</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("enter_password")}
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                  value={validation.values.password || ""}
                  style={{ ...inputStyle(validation.touched.password, !!validation.errors.password), paddingRight: 46 }}
                  onFocus={(e) => { if (!(validation.touched.password && validation.errors.password)) e.target.style.borderColor = T.green; }}
                  onBlurCapture={(e) => { if (!(validation.touched.password && validation.errors.password)) e.target.style.borderColor = T.border; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  {showPassword
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.4 9.4 0 0 1 12 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5M6.1 6.6C4 7.9 3 9.9 3 12c0 0 4 7 9 7 1 0 2-.2 2.9-.5" /></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
              </div>
              {validation.touched.password && validation.errors.password && (
                <p style={{ color: T.red, fontSize: 12, marginTop: 6 }}>{validation.errors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input type="checkbox" id="remember-check" style={{ width: 16, height: 16, accentColor: T.green, cursor: 'pointer' }} />
              <label htmlFor="remember-check" style={{ fontSize: 13, color: T.muted, cursor: 'pointer' }}>{t("remember_me")}</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loader}
              style={{
                width: '100%', padding: 15, background: T.ink, border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 15.5, fontWeight: 700, fontFamily: FONT,
                cursor: loader ? 'not-allowed' : 'pointer', opacity: loader ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loader && <Spinner size="sm" />}
              {t("sign_in")}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <p className="v2-mono" style={{ fontSize: 11, color: T.faint, fontFamily: "'JetBrains Mono',monospace" }}>&copy; 2026 · TUPELUKERIA</p>
        </div>
      </div>
    </div>
  );
};

export default withRouter(Login);
