import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Badge,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import { getMyBusinesses, switchTenant, createBranch, setPrimaryBranch, TenantBusiness } from "../../services/tenantApi";
import { getDecodedToken, setToken, getRoleFromToken } from "../../services/auth";
import { selectTenantPlan } from "../../slices/Settings/settingsSlice";

const businessTypeLabels: Record<string, string> = {
  peluqueria: "Peluqueria",
  barberia: "Barberia",
};

const TenantSwitcher = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [businesses, setBusinesses] = useState<TenantBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("peluqueria");

  const roleId = getRoleFromToken();
  const decoded = getDecodedToken();
  const currentTenantId = decoded?.user?.tenant_id;
  const tokenTenantName = decoded?.user?.tenant_name;
  const isAdmin = roleId === 1;
  const tenantPlan = useSelector(selectTenantPlan);
  const isMaxPlan = tenantPlan === 'enterprise';

  const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    free: { label: 'Gratis', color: '#878a99' },
    pro: { label: 'Pro', color: '#438eff' },
    business: { label: 'Business', color: '#299cdb' },
    enterprise: { label: 'Enterprise', color: '#f7b84b' },
  };
  const planInfo = PLAN_LABELS[tenantPlan] || PLAN_LABELS.free;

  const fetchBusinesses = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await getMyBusinesses();
      setBusinesses(res.data);
    } catch (err) {
      console.error("Error fetching businesses:", err);
      // Fallback: if my-businesses fails, at least show current tenant
      if (currentTenantId) {
        try {
          const { data } = await import("../../services/api").then(m => m.api.get(`/tenants/${currentTenantId}`));
          if (data?.name) {
            setBusinesses([{ id: currentTenantId, name: data.name, business_type: data.business_type || 'peluqueria' } as TenantBusiness]);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentTenantId]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (toggleRef.current && toggleRef.current.contains(e.target as Node)) return;
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Don't render for non-admins
  if (!isAdmin) return null;

  const currentBusiness = businesses.find((b) => b.id === currentTenantId);

  const handleToggle = () => {
    if (!isOpen && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenantId || switching) return;
    setSwitching(true);
    try {
      const res = await switchTenant(tenantId);
      setToken(res.data.token);
      // Update sessionStorage authUser with new token AND tenant info
      const rawUser = sessionStorage.getItem("authUser");
      if (rawUser) {
        try {
          const authUser = JSON.parse(rawUser);
          authUser.token = res.data.token;
          // Also update the user object with the new tenant_id and name
          if (authUser.user) {
            authUser.user.tenant_id = tenantId;
            authUser.user.tenant_name = res.data.tenant?.name || authUser.user.tenant_name;
          }
          sessionStorage.setItem("authUser", JSON.stringify(authUser));
        } catch {}
      }
      window.location.reload();
    } catch (err) {
      console.error("Error switching tenant:", err);
      setSwitching(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await createBranch({ name: newName.trim(), business_type: newType });
      setModalOpen(false);
      setNewName("");
      setNewType("peluqueria");
      await fetchBusinesses();
      handleSwitch(res.data.id);
    } catch (err) {
      console.error("Error creating business:", err);
      setCreating(false);
    }
  };

  const dropdownMenu = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu show shadow"
          style={{
            position: "fixed",
            bottom: `${menuPos.bottom}px`,
            left: `${menuPos.left}px`,
            minWidth: "240px",
            zIndex: 99999,
            borderRadius: "8px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <div className="p-2">
            <h6 className="text-muted mb-2 fs-12 text-uppercase">Mis Negocios</h6>
          </div>
          {loading ? (
            <div className="text-center p-3">
              <Spinner size="sm" />
            </div>
          ) : (
            businesses.map((biz) => (
              <div key={biz.id} className="d-flex align-items-center">
                <button
                  className={`dropdown-item d-flex align-items-center justify-content-between flex-grow-1${biz.id === currentTenantId ? " active" : ""}`}
                  onClick={() => { handleSwitch(biz.id); setIsOpen(false); }}
                  disabled={switching}
                  type="button"
                >
                  <span>
                    {biz.is_primary_branch && (
                      <i className="ri-vip-crown-fill me-1 text-warning align-middle" title="Sede principal"></i>
                    )}
                    <i className="ri-store-2-line me-1 align-middle"></i>
                    {biz.name}
                  </span>
                  <Badge
                    color={biz.business_type === "barberia" ? "info" : "primary"}
                    className="ms-2"
                    pill
                  >
                    {businessTypeLabels[biz.business_type] || biz.business_type}
                  </Badge>
                </button>
                {isMaxPlan && !biz.is_primary_branch && businesses.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost-warning px-1"
                    title="Establecer como sede principal"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await setPrimaryBranch(biz.id);
                        await fetchBusinesses();
                      } catch (err) {
                        console.error("Error setting primary:", err);
                      }
                    }}
                    style={{ lineHeight: 1 }}
                  >
                    <i className="ri-vip-crown-line fs-14"></i>
                  </button>
                )}
              </div>
            ))
          )}
          <div className="dropdown-divider"></div>
          <button
            className="dropdown-item text-success fw-medium"
            onClick={() => { setModalOpen(true); setIsOpen(false); }}
            type="button"
          >
            <i className="ri-add-circle-line me-2 align-middle"></i>
            Crear Negocio
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="tenant-switcher-sidebar" style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "8px" }}>
        <button
          ref={toggleRef}
          type="button"
          onClick={handleToggle}
          className="btn btn-sm w-100 text-start d-flex align-items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "8px 12px",
            color: "var(--vz-sidebar-menu-item-color, #abb9e8)",
            transition: "background 0.2s",
          }}
        >
          <i className="ri-store-2-line fs-18" style={{ flexShrink: 0 }}></i>
          <div className="flex-grow-1 overflow-hidden sidebar-switcher-text">
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7, lineHeight: 1 }}>
              Negocio actual
            </div>
            <div className="text-truncate" style={{ fontWeight: 600, fontSize: "13px", color: "var(--vz-sidebar-menu-item-active-color, #fff)", lineHeight: 1.3 }}>
              {currentBusiness?.name || tokenTenantName || "Mi Negocio"}
            </div>
            <div style={{ marginTop: "2px" }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 8px",
                borderRadius: "10px",
                background: `${planInfo.color}22`,
                color: planInfo.color,
                letterSpacing: "0.3px",
                textTransform: "uppercase",
              }}>
                {planInfo.label}
              </span>
            </div>
          </div>
          <i className="ri-arrow-up-s-line fs-16" style={{ flexShrink: 0, opacity: 0.5 }}></i>
        </button>
      </div>

      {dropdownMenu}

      {!isMaxPlan && (
        <div style={{ padding: "8px 0 0 0" }}>
          <button
            type="button"
            onClick={() => navigate("/settings?tab=6")}
            className="btn btn-sm w-100 text-start d-flex align-items-center gap-2"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15))",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "6px",
              padding: "8px 12px",
              color: "#a78bfa",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            <i className="ri-vip-crown-line fs-16" style={{ flexShrink: 0 }}></i>
            <span className="sidebar-switcher-text">Upgrade de Plan</span>
          </button>
        </div>
      )}

      <Modal isOpen={modalOpen} toggle={() => !creating && setModalOpen(false)} centered>
        <ModalHeader toggle={() => !creating && setModalOpen(false)}>
          Crear Nuevo Negocio
        </ModalHeader>
        <ModalBody>
          <Form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <FormGroup>
              <Label for="businessName">Nombre del negocio</Label>
              <Input
                id="businessName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Mi Peluqueria Centro"
                disabled={creating}
                autoFocus
              />
            </FormGroup>
            <FormGroup>
              <Label for="businessType">Tipo de negocio</Label>
              <Input
                id="businessType"
                type="select"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                disabled={creating}
              >
                <option value="peluqueria">Peluqueria</option>
                <option value="barberia">Barberia</option>
              </Input>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setModalOpen(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button color="success" onClick={handleCreate} disabled={!newName.trim() || creating}>
            {creating ? <><Spinner size="sm" className="me-1" /> Creando...</> : "Crear Negocio"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default TenantSwitcher;
