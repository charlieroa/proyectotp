import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardBody, Row, Col, Badge, Spinner, Input, UncontrolledTooltip } from "reactstrap";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";
import { api } from "../../services/api";
import { getCalendarData as onGetCalendarData } from "../../slices/thunks";
import AppointmentModal from "../../Components/Calendar/AppointmentModal";

type Branch = { id: string; name: string; branch_color: string };
type StylistBranch = { id: string; name: string; color: string };
type Stylist = {
  id: string;
  first_name: string;
  last_name: string;
  branches: StylistBranch[];
};
type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  tenant_id: string;
  stylist_id: string;
  service_id: string;
  client_id: string;
  service_name: string;
  price: number;
  stylist_first_name: string;
  stylist_last_name: string;
  stylist_name: string;
  client_first_name: string;
  client_last_name: string;
  client_name: string;
  branch_name: string;
  branch_color: string;
};
type SalesByBranch = { tenant_id: string; branch_name: string; branch_color: string; total_sales: number; invoice_count: number };
type ActiveByBranch = { tenant_id: string; branch_name: string; active_count: number };
type LowStockProduct = { id: string; name: string; stock: number; branch_name: string };

const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Time grid constants
const START_HOUR = 6;
const END_HOUR = 22;
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2; // 32 half-hour slots
const SLOT_WIDTH = 80; // px per 30-min slot

const formatHour12 = (h: number, m: number): string => {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(formatHour12(h, 0));
    slots.push(formatHour12(h, 30));
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Calculate grid column from a Date for a given day
const timeToCol = (date: Date): number => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = (hours - START_HOUR) * 60 + minutes;
  return Math.max(0, Math.min(SLOT_COUNT, totalMinutes / 30));
};

const formatDateTitle = (date: Date): string => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'primary' },
  pending_approval: { label: 'Pendiente', color: 'warning' },
  checked_in: { label: 'En atencion', color: 'info' },
  checked_out: { label: 'Finalizada', color: 'success' },
  completed: { label: 'Completada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'danger' },
  rescheduled: { label: 'Reagendada', color: 'secondary' },
  no_show: { label: 'No asistio', color: 'dark' },
};

const SuperCalendar: React.FC = () => {
  const dispatch: any = useDispatch();
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [activeByBranch, setActiveByBranch] = useState<ActiveByBranch[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const [calRes, branchRes] = await Promise.all([
        api.get('/appointments/super-calendar', { params: { start: start.toISOString(), end: end.toISOString() } }),
        api.get('/tenants/my-businesses'),
      ]);

      const data = calRes.data;
      setAppointments(data.appointments || []);
      setStylists(data.stylists || []);
      setSalesByBranch(data.widgets?.sales_by_branch || []);
      setActiveByBranch(data.widgets?.active_stylists_by_branch || []);
      setLowStock(data.widgets?.low_stock_products || []);

      const branchList: Branch[] = (branchRes.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        branch_color: b.branch_color || '#3788d8',
      }));
      setBranches(branchList);
      setSelectedBranches(prev => prev.size > 0 ? prev : new Set(branchList.map(b => b.id)));
    } catch (err) {
      console.error('Error loading super calendar:', err);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const toggleBranch = (id: string) => {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };
  const goPrev = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
  const goNext = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });

  const handleAppointmentClick = (appt: Appointment) => {
    const canModify = ['scheduled', 'rescheduled', 'pending_approval'].includes(appt.status);
    if (!canModify) return;

    const startTime = new Date(appt.start_time).toLocaleString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

    Swal.fire({
      title: '¿Qué deseas hacer con esta cita?',
      html: `<div class="text-start">
        <p class="mb-1"><strong>${appt.service_name || 'Servicio'}</strong></p>
        <p class="mb-1" style="color:#878a99"><i class="ri-user-line me-1"></i>${appt.client_name || 'Sin cliente'}</p>
        <p class="mb-1" style="color:#878a99"><i class="ri-scissors-line me-1"></i>${appt.stylist_name || ''}</p>
        <p class="mb-1" style="color:#878a99"><i class="ri-time-line me-1"></i>${startTime}</p>
        <p class="mb-0" style="color:#878a99"><i class="ri-building-line me-1"></i>${appt.branch_name || ''}</p>
      </div>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '<i class="ri-calendar-event-line me-1"></i> Reprogramar',
      denyButtonText: '<i class="ri-close-circle-line me-1"></i> Cancelar Cita',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#f7b84b',
      denyButtonColor: '#f06548',
    }).then((result) => {
      if (result.isConfirmed) {
        // Load calendar data (services, clients) then open modal
        dispatch(onGetCalendarData());
        setRescheduleEvent({
          id: appt.id,
          client_id: appt.client_id,
          service_id: appt.service_id,
          stylist_id: appt.stylist_id,
          start_time: appt.start_time,
          end_time: appt.end_time,
          status: appt.status,
          service_name: appt.service_name,
          client_first_name: appt.client_first_name,
          client_last_name: appt.client_last_name,
          stylist_first_name: appt.stylist_first_name,
          stylist_last_name: appt.stylist_last_name,
        });
        setRescheduleModalOpen(true);
      } else if (result.isDenied) {
        Swal.fire({
          title: '¿Confirmar cancelación?',
          text: 'Esta acción marcará la cita como cancelada.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#f06548',
          cancelButtonColor: '#878a99',
          confirmButtonText: 'Sí, cancelar cita',
          cancelButtonText: 'No, volver',
        }).then(async (confirmResult) => {
          if (confirmResult.isConfirmed) {
            try {
              await api.patch(`/appointments/${appt.id}/status`, { status: 'cancelled' });
              Swal.fire({ icon: 'success', title: 'Cita cancelada', timer: 2000, showConfirmButton: false });
              fetchData(selectedDate);
            } catch (err: any) {
              Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.error || 'No se pudo cancelar la cita.' });
            }
          }
        });
      }
    });
  };

  // Group appointments by stylist_id, filtered by selected branches
  const appointmentsByStylist = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (selectedBranches.has(a.tenant_id)) {
        if (!map[a.stylist_id]) map[a.stylist_id] = [];
        map[a.stylist_id].push(a);
      }
    });
    return map;
  }, [appointments, selectedBranches]);

  // Sort stylists: shared (multi-branch) first, then alphabetically
  const sortedStylists = useMemo(() => {
    // Only show stylists who belong to at least one selected branch
    const filtered = stylists.filter(s =>
      s.branches.some(b => selectedBranches.has(b.id))
    );
    return [...filtered].sort((a, b) => {
      const aBranches = a.branches.length;
      const bBranches = b.branches.length;
      if (aBranches !== bBranches) return bBranches - aBranches; // more branches first
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [stylists, selectedBranches]);

  if (loading && !initialLoaded) {
    return <div className="text-center p-5"><Spinner /> <span className="ms-2">Cargando supercalendario...</span></div>;
  }

  const gridTotalWidth = SLOT_COUNT * SLOT_WIDTH;

  return (
    <div>
      {/* Date navigation + Branch filters */}
      <Card className="border shadow-sm mb-3">
        <CardBody className="py-2">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-soft-primary" onClick={goPrev}>
                <i className="ri-arrow-left-s-line"></i>
              </button>
              <button className="btn btn-sm btn-soft-primary" onClick={goToday}>Hoy</button>
              <button className="btn btn-sm btn-soft-primary" onClick={goNext}>
                <i className="ri-arrow-right-s-line"></i>
              </button>
              <h6 className="mb-0 ms-2">{formatDateTitle(selectedDate)}</h6>
              {loading && <Spinner size="sm" className="ms-2" />}
            </div>
            {branches.length >= 1 && (
              <div className="d-flex flex-wrap gap-2">
                {branches.map(b => (
                  <div
                    key={b.id}
                    className="d-flex align-items-center gap-1 px-2 py-1 rounded border"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedBranches.has(b.id) ? b.branch_color + '20' : 'transparent',
                      borderColor: selectedBranches.has(b.id) ? b.branch_color : '#dee2e6',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => toggleBranch(b.id)}
                  >
                    <Input
                      type="checkbox"
                      className="form-check-input m-0"
                      checked={selectedBranches.has(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      style={{ accentColor: b.branch_color, width: 14, height: 14 }}
                    />
                    <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: b.branch_color }} />
                    <span className="fw-medium">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Stylist Timeline */}
      <Card className="border shadow-sm mb-3">
        <CardBody className="p-0">
          <div style={{ display: 'flex', overflow: 'hidden' }}>
            {/* Sticky left column: stylist names */}
            <div style={{ minWidth: 180, maxWidth: 180, flexShrink: 0, borderRight: '2px solid #e9ebec', zIndex: 2, background: '#fff' }}>
              {/* Header cell */}
              <div style={{ height: 40, borderBottom: '1px solid #e9ebec', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <span className="fw-semibold text-muted" style={{ fontSize: '0.8rem' }}>Estilista</span>
              </div>
              {/* Stylist rows */}
              {sortedStylists.map(s => (
                <div
                  key={s.id}
                  style={{
                    height: 60,
                    borderBottom: '1px solid #f3f3f9',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '4px 12px',
                  }}
                >
                  <div className="fw-medium text-truncate" style={{ fontSize: '0.85rem' }}>
                    {s.first_name} {s.last_name || ''}
                  </div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {s.branches.map(b => (
                      <span
                        key={b.id}
                        className="badge"
                        style={{
                          backgroundColor: b.color + '25',
                          color: b.color,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          padding: '1px 5px',
                          border: `1px solid ${b.color}40`,
                        }}
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {sortedStylists.length === 0 && (
                <div style={{ padding: 16 }} className="text-muted small">Sin estilistas</div>
              )}
            </div>

            {/* Scrollable time grid */}
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <div style={{ minWidth: gridTotalWidth }}>
                {/* Time header */}
                <div style={{ display: 'flex', height: 40, borderBottom: '1px solid #e9ebec' }}>
                  {TIME_SLOTS.map((slot, i) => {
                    const isHour = slot.includes(':00');
                    return (
                      <div
                        key={slot}
                        style={{
                          width: SLOT_WIDTH,
                          minWidth: SLOT_WIDTH,
                          borderLeft: isHour ? '1px solid #e9ebec' : '1px solid #f3f3f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: isHour ? '#495057' : '#adb5bd',
                          fontWeight: isHour ? 600 : 400,
                          backgroundColor: isHour ? '#fafbfc' : 'transparent',
                        }}
                      >
                        {slot}
                      </div>
                    );
                  })}
                </div>

                {/* Stylist rows with appointments */}
                {sortedStylists.map(s => {
                  const stylistAppts = appointmentsByStylist[s.id] || [];
                  return (
                    <div
                      key={s.id}
                      style={{
                        height: 60,
                        borderBottom: '1px solid #f3f3f9',
                        position: 'relative',
                        display: 'flex',
                      }}
                    >
                      {/* Grid lines */}
                      {TIME_SLOTS.map((slot, i) => {
                        const isHour = slot.includes(':00');
                        return (
                          <div
                            key={slot}
                            style={{
                              width: SLOT_WIDTH,
                              minWidth: SLOT_WIDTH,
                              borderLeft: isHour ? '1px solid #e9ebec' : '1px solid #f8f8fb',
                              height: '100%',
                            }}
                          />
                        );
                      })}

                      {/* Appointment blocks */}
                      {stylistAppts.map(appt => {
                        const apptStart = new Date(appt.start_time);
                        const apptEnd = new Date(appt.end_time);
                        const colStart = timeToCol(apptStart);
                        const colEnd = timeToCol(apptEnd);
                        const width = Math.max((colEnd - colStart) * SLOT_WIDTH, SLOT_WIDTH / 2);
                        const left = colStart * SLOT_WIDTH;
                        const tooltipId = `appt-${appt.id}`;
                        const bgColor = appt.branch_color || '#3788d8';

                        return (
                          <React.Fragment key={appt.id}>
                            <div
                              id={tooltipId}
                              onClick={() => handleAppointmentClick(appt)}
                              style={{
                                position: 'absolute',
                                top: 4,
                                bottom: 4,
                                left: left + 1,
                                width: width - 2,
                                backgroundColor: bgColor,
                                borderRadius: 4,
                                padding: '2px 6px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                color: '#fff',
                                fontSize: '0.72rem',
                                lineHeight: 1.3,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                zIndex: 1,
                                transition: 'transform .15s, box-shadow .15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)'; }}
                            >
                              <div className="fw-semibold text-truncate">{appt.service_name}</div>
                              <div className="text-truncate" style={{ opacity: 0.9 }}>{appt.client_name}</div>
                              <div className="text-truncate" style={{ opacity: 0.85 }}>
                                {apptStart.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                            </div>
                            <UncontrolledTooltip target={tooltipId} placement="top">
                              Click para cancelar o reprogramar
                            </UncontrolledTooltip>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}

                {sortedStylists.length === 0 && (
                  <div className="text-center text-muted py-4">
                    No hay estilistas para mostrar. Verifica los filtros de sede.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

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

      {/* Reschedule Modal */}
      <AppointmentModal
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setRescheduleEvent(null);
          fetchData(selectedDate);
        }}
        selectedEvent={rescheduleEvent}
      />
    </div>
  );
};

export default SuperCalendar;
