// SedeSwitcher — tarjeta del pie del sidebar de /v2. Muestra la sede activa y,
// para admins con varias sedes, despliega un menú para cambiar entre ellas
// (reutiliza /tenants/my-businesses y /auth/switch-tenant, igual que el TenantSwitcher viejo).
import React, { useEffect, useState, useRef, useCallback } from "react";
import { T } from "../theme";
import { getMyBusinesses, switchTenant, TenantBusiness } from "../../../services/tenantApi";
import { getRoleFromToken, getTenantIdFromToken, setToken } from "../../../services/auth";

const SedeSwitcher: React.FC<{ name: string; city?: string }> = ({ name, city }) => {
  const role = getRoleFromToken();
  const currentId = getTenantIdFromToken();
  const isAdmin = role === 1;

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [businesses, setBusinesses] = useState<TenantBusiness[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    getMyBusinesses()
      .then(({ data }) => { if (alive) setBusinesses(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setBusinesses([]); });
    return () => { alive = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSwitch = useCallback(async (id: string) => {
    if (id === currentId || switching) return;
    setSwitching(true);
    try {
      const res = await switchTenant(id);
      setToken(res.data.token);
      const rawUser = sessionStorage.getItem("authUser");
      if (rawUser) {
        try {
          const au = JSON.parse(rawUser);
          au.token = res.data.token;
          if (au.user) {
            au.user.tenant_id = id;
            au.user.tenant_name = res.data.tenant?.name || au.user.tenant_name;
          }
          sessionStorage.setItem("authUser", JSON.stringify(au));
        } catch { /* noop */ }
      }
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }, [currentId, switching]);

  const multi = isAdmin && businesses.length > 1;
  const displayName = businesses.find((b) => b.id === currentId)?.name || name || "Mi salón";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* menú de sedes (aparece hacia arriba) */}
      {open && multi && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 18px 44px rgba(0,0,0,.16)", padding: 8, zIndex: 60, maxHeight: 320, overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".8px", color: T.faint, padding: "6px 8px" }}>MIS SEDES</div>
          {businesses.map((b) => {
            const active = b.id === currentId;
            return (
              <button
                key={b.id}
                onClick={() => handleSwitch(b.id)}
                disabled={switching}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 10,
                  background: active ? T.surface3 : "transparent", border: 0, cursor: switching ? "wait" : "pointer", textAlign: "left",
                }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 7, background: T.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flex: "none" }}>
                  {(b.name || "S").slice(0, 1).toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
                {active && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => multi && setOpen((o) => !o)}
        title={multi ? "Cambiar de sede" : displayName}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 8px",
          border: `1px solid ${T.border}`, borderRadius: 12, background: T.surface,
          cursor: multi ? "pointer" : "default", fontFamily: "inherit", textAlign: "left",
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flex: "none" }}>
          {(displayName || "S").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
          <div style={{ fontSize: 10.5, color: T.dim }}>{multi ? `${businesses.length} sedes` : (city || "—")}</div>
        </div>
        {multi && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="m8 9 4-4 4 4M8 15l4 4 4-4" /></svg>
        )}
      </button>
    </div>
  );
};

export default SedeSwitcher;
