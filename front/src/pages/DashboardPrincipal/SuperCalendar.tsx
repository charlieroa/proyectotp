import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Card, CardBody, Row, Col, Badge, Spinner, Input } from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import BootstrapTheme from "@fullcalendar/bootstrap";
import esLocale from "@fullcalendar/core/locales/es";
import { api } from "../../services/api";

type Branch = { id: string; name: string; branch_color: string };
type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  tenant_id: string;
  service_name: string;
  price: number;
  stylist_name: string;
  client_name: string;
  branch_name: string;
  branch_color: string;
};
type SalesByBranch = { tenant_id: string; branch_name: string; branch_color: string; total_sales: number; invoice_count: number };
type ActiveByBranch = { tenant_id: string; branch_name: string; active_count: number };
type LowStockProduct = { id: string; name: string; stock: number; branch_name: string };

const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const SuperCalendar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [activeByBranch, setActiveByBranch] = useState<ActiveByBranch[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const lastRangeRef = useRef<string>('');

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [calRes, branchRes] = await Promise.all([
        api.get('/appointments/super-calendar', { params: { start, end } }),
        api.get('/tenants/my-businesses'),
      ]);

      const data = calRes.data;
      setAppointments(data.appointments || []);
      setSalesByBranch(data.widgets?.sales_by_branch || []);
      setActiveByBranch(data.widgets?.active_stylists_by_branch || []);
      setLowStock(data.widgets?.low_stock_products || []);

      const branchList: Branch[] = (branchRes.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        branch_color: b.branch_color || '#3788d8',
      }));
      setBranches(branchList);
      setSelectedBranches(new Set(branchList.map(b => b.id)));
    } catch (err) {
      console.error('Error loading super calendar:', err);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  const toggleBranch = (id: string) => {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAppointments = useMemo(() =>
    appointments.filter(a => selectedBranches.has(a.tenant_id)),
  [appointments, selectedBranches]);

  const calendarEvents = useMemo(() =>
    filteredAppointments.map(a => ({
      id: a.id,
      title: `${a.service_name} - ${a.client_name}`,
      start: a.start_time,
      end: a.end_time,
      backgroundColor: a.branch_color || '#3788d8',
      borderColor: a.branch_color || '#3788d8',
      extendedProps: {
        stylist: a.stylist_name,
        branch: a.branch_name,
        status: a.status,
      },
    })),
  [filteredAppointments]);

  // Initial load
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    lastRangeRef.current = `${start}|${end}`;
    fetchData(start, end);
  }, [fetchData]);

  const handleDatesSet = useCallback((arg: any) => {
    const start = arg.start.toISOString();
    const end = arg.end.toISOString();
    const key = `${start}|${end}`;
    if (key === lastRangeRef.current) return;
    lastRangeRef.current = key;
    fetchData(start, end);
  }, [fetchData]);

  if (loading && !initialLoaded) {
    return <div className="text-center p-5"><Spinner /> <span className="ms-2">Cargando supercalendario...</span></div>;
  }

  return (
    <div>
      {/* Widgets */}
      <Row className="mb-3">
        <Col md={4}>
          <Card className="border shadow-sm">
            <CardBody>
              <h6 className="text-muted mb-3">Ventas por Sede</h6>
              {salesByBranch.length === 0 ? <p className="text-muted small">Sin ventas en este periodo</p> : (
                salesByBranch.map(s => (
                  <div key={s.tenant_id} className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center">
                      <span className="d-inline-block rounded-circle me-2" style={{ width: 10, height: 10, backgroundColor: s.branch_color }} />
                      <span className="small">{s.branch_name}</span>
                    </div>
                    <strong className="small">{formatterCOP.format(Number(s.total_sales))}</strong>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border shadow-sm">
            <CardBody>
              <h6 className="text-muted mb-3">Estilistas Activos</h6>
              {activeByBranch.length === 0 ? <p className="text-muted small">Ninguno en geofence actualmente</p> : (
                activeByBranch.map(a => (
                  <div key={a.tenant_id} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">{a.branch_name}</span>
                    <Badge color="success">{a.active_count}</Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border shadow-sm">
            <CardBody>
              <h6 className="text-muted mb-3">Stock Bajo</h6>
              {lowStock.length === 0 ? <p className="text-muted small">Todo el inventario OK</p> : (
                lowStock.slice(0, 5).map(p => (
                  <div key={p.id} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">{p.name} <small className="text-muted">({p.branch_name})</small></span>
                    <Badge color={p.stock <= 2 ? "danger" : "warning"}>{p.stock} uds</Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Branch filter */}
      {branches.length > 1 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {branches.map(b => (
            <div
              key={b.id}
              className="d-flex align-items-center gap-1 px-2 py-1 rounded border"
              style={{
                cursor: 'pointer',
                backgroundColor: selectedBranches.has(b.id) ? b.branch_color + '20' : 'transparent',
                borderColor: selectedBranches.has(b.id) ? b.branch_color : '#dee2e6',
              }}
              onClick={() => toggleBranch(b.id)}
            >
              <Input
                type="checkbox"
                className="form-check-input m-0"
                checked={selectedBranches.has(b.id)}
                onChange={() => toggleBranch(b.id)}
                style={{ accentColor: b.branch_color }}
              />
              <span className="d-inline-block rounded-circle" style={{ width: 10, height: 10, backgroundColor: b.branch_color }} />
              <span className="small fw-medium">{b.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardBody>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, BootstrapTheme]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            locale={esLocale}
            themeSystem="bootstrap"
            events={calendarEvents}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="auto"
            editable={false}
            selectable={false}
            datesSet={handleDatesSet}
            eventContent={(arg) => {
              const ext = arg.event.extendedProps;
              return (
                <div className="p-1" style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                  <div className="fw-semibold text-truncate">{arg.event.title}</div>
                  <div className="text-truncate" style={{ opacity: 0.85 }}>{ext.stylist}</div>
                  <div style={{ opacity: 0.7 }}>{ext.branch}</div>
                </div>
              );
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
};

export default SuperCalendar;
