import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardBody, Col, Container, Row, Label, Input, Button, Badge, Nav, NavItem, NavLink, TabContent, TabPane, Collapse } from 'reactstrap';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { GoogleMap, useJsApiLoader, Circle as GCircle, OverlayView, InfoWindow } from '@react-google-maps/api';
import { api } from '../../services/api';
import { getIsPrimaryBranch, getTenantIdFromToken } from '../../services/auth';
import useGeoSocket from '../../hooks/useGeoSocket';

const GOOGLE_MAPS_KEY = 'AIzaSyB55B8MhuwMcz1PtVlfWYL30asQ8-E9zvU';
const defaultCenter = { lat: 4.726518, lng: -74.034619 };

interface Stylist {
    id: number | string;
    name: string;
    lat: number | null;
    lng: number | null;
    status: 'connected' | 'disconnected';
    lastSeen: string;
    connectedAt?: string | null;
    disconnectedAt?: string | null;
    has_location?: boolean;
    last_location_update?: string;
    last_geofence_event?: string;
    last_geofence_event_time?: string;
}

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'ayer';
    return `${diffDays}d`;
};

const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const getConnectionTimeText = (stylist: Stylist): string => {
    if (stylist.status === 'connected' && stylist.connectedAt) {
        return `Activo desde ${formatTime(stylist.connectedAt)}`;
    } else if (stylist.status === 'disconnected' && stylist.disconnectedAt) {
        return `Inactivo desde ${formatTime(stylist.disconnectedAt)}`;
    } else if (stylist.last_location_update) {
        return `Hace ${getRelativeTime(stylist.last_location_update)}`;
    }
    return 'Sin datos de ubicación';
};

// Custom marker component rendered on Google Maps
const StylistMarker: React.FC<{
    stylist: Stylist & { lat: number; lng: number };
    isInZone: boolean;
    isSelected: boolean;
    onClick: () => void;
}> = ({ stylist, isInZone, isSelected, onClick }) => {
    const initials = stylist.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const size = isSelected ? 52 : 44;
    const bg = isInZone ? '#10b981' : '#f59e0b';
    const border = isSelected ? '4px solid #405189' : '3px solid #ffffff';
    const dotColor = isInZone ? '#10b981' : '#f59e0b';

    return (
        <OverlayView
            position={{ lat: stylist.lat, lng: stylist.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
            <div
                onClick={onClick}
                style={{
                    width: size, height: size, borderRadius: '50%',
                    background: bg, color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.35,
                    border, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
                    position: 'relative', cursor: 'pointer',
                    transform: 'translate(-50%, -50%)',
                }}
            >
                {initials}
                <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: dotColor, border: '2px solid white',
                }} />
            </div>
        </OverlayView>
    );
};

const Geolocalizacion: React.FC = () => {
    const { t } = useTranslation();
    document.title = "Geolocalización | Sistema de Peluquerías";

    const { isLoaded } = useJsApiLoader({ id: 'google-map', googleMapsApiKey: GOOGLE_MAPS_KEY });

    const [activeTab, setActiveTab] = useState<string>('list');
    const [radius, setRadius] = useState<number>(200);
    const [circleCenter, setCircleCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [stylistsInZone, setStylistsInZone] = useState<Stylist[]>([]);
    const [stylistsOutZone, setStylistsOutZone] = useState<Stylist[]>([]);
    const [allStylists, setAllStylists] = useState<Stylist[]>([]);
    const [selectedStylist, setSelectedStylist] = useState<number | string | null>(null);
    const [showDisconnected, setShowDisconnected] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const isPrimary = getIsPrimaryBranch();
    const [branchGeofences, setBranchGeofences] = useState<{ tenant_id: string; name: string; color: string; center: { lat: number; lng: number }; radius: number }[]>([]);
    const mapRef = useRef<google.maps.Map | null>(null);

    const tenantId = getTenantIdFromToken();

    // Real-time location updates via Socket.IO
    useGeoSocket({
        tenantId: tenantId || undefined,
        onLocationUpdate: useCallback((data) => {
            setAllStylists(prev => prev.map(s => {
                if (s.id === data.stylist_id) {
                    return {
                        ...s,
                        lat: data.lat,
                        lng: data.lng,
                        status: data.is_inside_geofence ? 'connected' as const : 'disconnected' as const,
                        lastSeen: data.timestamp,
                        last_location_update: data.timestamp,
                        connectedAt: data.geofence_event === 'entry' ? data.timestamp : s.connectedAt,
                        disconnectedAt: data.geofence_event === 'exit' ? data.timestamp : s.disconnectedAt,
                    };
                }
                return s;
            }));
        }, [])
    });

    useEffect(() => {
        if (isPrimary) loadBranches();
    }, [isPrimary]);

    const loadBranches = async () => {
        try {
            const { data } = await api.get('/tenants/my-businesses');
            if (Array.isArray(data)) {
                const geofences: typeof branchGeofences = [];
                for (const b of data) {
                    if (b.geofence_center_lat && b.geofence_center_lng) {
                        geofences.push({
                            tenant_id: b.id, name: b.name, color: b.branch_color || '#3788d8',
                            center: { lat: b.geofence_center_lat, lng: b.geofence_center_lng },
                            radius: b.geofence_radius || 200
                        });
                    }
                }
                setBranchGeofences(geofences);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        loadStylists();
        loadGeofenceConfig();
        const interval = setInterval(loadStylists, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadStylists = async () => {
        try {
            const response = await api.get('/stylists/tracking');
            const stylists: Stylist[] = response.data.stylists.map((s: any) => ({
                id: s.id,
                name: s.name,
                lat: s.lat,
                lng: s.lng,
                status: s.status,
                lastSeen: s.last_location_update || new Date().toISOString(),
                connectedAt: s.last_geofence_event === 'entry' ? s.last_geofence_event_time : null,
                disconnectedAt: s.last_geofence_event === 'exit' ? s.last_geofence_event_time : null,
                has_location: s.has_location,
                last_location_update: s.last_location_update
            }));
            setAllStylists(stylists);
            setLoading(false);
        } catch (error) {
            console.error('Error cargando estilistas:', error);
            setLoading(false);
        }
    };

    const loadGeofenceConfig = async () => {
        try {
            const response = await api.get('/stylists/geofence-config');
            const geofence = response.data.geofence;
            setCircleCenter(geofence.center);
            setRadius(geofence.radius);
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.panTo(geofence.center);
                    mapRef.current.setZoom(15);
                }
            }, 500);
        } catch (error) {
            console.error('Error cargando configuración de geocerca:', error);
        }
    };

    // Filter stylists in/out of zone
    useEffect(() => {
        if (circleCenter && allStylists.length > 0) {
            const inZone: Stylist[] = [];
            const outZone: Stylist[] = [];

            allStylists.forEach(stylist => {
                if (!stylist.lat || !stylist.lng) {
                    outZone.push(stylist);
                    return;
                }
                const distance = getDistance(circleCenter.lat, circleCenter.lng, stylist.lat, stylist.lng);
                const isInZone = distance <= radius;
                const updatedStylist: Stylist = {
                    ...stylist,
                    status: isInZone ? 'connected' : 'disconnected' as const
                };
                if (isInZone) {
                    inZone.push(updatedStylist);
                } else {
                    outZone.push(updatedStylist);
                }
            });

            inZone.sort((a, b) => a.name.localeCompare(b.name));
            outZone.sort((a, b) => {
                const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
                const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
                return timeB - timeA;
            });

            setStylistsInZone(inZone);
            setStylistsOutZone(outZone);
        } else if (allStylists.length > 0) {
            setStylistsInZone([]);
            setStylistsOutZone(allStylists);
        }
    }, [circleCenter, radius, allStylists]);

    const centerOnStylist = (stylist: Stylist) => {
        if (!stylist.lat || !stylist.lng || !mapRef.current) return;
        setSelectedStylist(stylist.id);
        mapRef.current.panTo({ lat: stylist.lat, lng: stylist.lng });
        mapRef.current.setZoom(16);
    };

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (isDrawing && e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setCircleCenter({ lat, lng });
            setIsDrawing(false);
            if (mapRef.current) {
                mapRef.current.panTo({ lat, lng });
                mapRef.current.setZoom(15);
            }
        }
    }, [isDrawing]);

    const startDrawing = () => { setIsDrawing(true); };
    const deleteZone = () => { setCircleCenter(null); setRadius(200); setStylistsInZone([]); };
    const centerOnZone = () => {
        if (circleCenter && mapRef.current) {
            mapRef.current.panTo(circleCenter);
            mapRef.current.setZoom(15);
        }
    };

    const mapCenter = useMemo(() => {
        if (circleCenter) return circleCenter;
        return defaultCenter;
    }, [circleCenter]);

    // Determine which zone each stylist with location belongs to
    const inZoneIds = useMemo(() => new Set(stylistsInZone.map(s => s.id)), [stylistsInZone]);

    // All stylists that have location data (for rendering markers)
    const stylistsWithLocation = useMemo(() =>
        allStylists.filter((s): s is Stylist & { lat: number; lng: number } => s.lat !== null && s.lng !== null),
        [allStylists]
    );

    const selectedStylistData = useMemo(() =>
        stylistsWithLocation.find(s => s.id === selectedStylist) || null,
        [stylistsWithLocation, selectedStylist]
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col lg={4}>
                            <Card>
                                <CardBody className="p-0">
                                    <div className="border-bottom">
                                        <Nav tabs className="nav-tabs-custom nav-justified">
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === 'list' })}
                                                    onClick={() => setActiveTab('list')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className="ri-team-line me-1"></i>
                                                    Estilistas
                                                    <Badge color="success" pill className="ms-2">
                                                        {stylistsInZone.length}
                                                    </Badge>
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={classnames({ active: activeTab === 'edit' })}
                                                    onClick={() => setActiveTab('edit')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <i className="ri-settings-4-line me-1"></i>
                                                    Editar Zona
                                                </NavLink>
                                            </NavItem>
                                        </Nav>
                                    </div>

                                    <TabContent activeTab={activeTab} className="p-3">
                                        <TabPane tabId="list">
                                            {circleCenter ? (
                                                <div className="bg-success bg-opacity-10 border border-success rounded p-2 mb-3 d-flex align-items-center justify-content-between">
                                                    <small className="text-success fw-medium">
                                                        <i className="ri-checkbox-circle-line me-1"></i>
                                                        Zona activa - Radio {radius} m
                                                    </small>
                                                    <Button color="link" size="sm" className="p-0 text-success" onClick={() => setActiveTab('edit')}>
                                                        Editar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="alert alert-warning mb-3 py-3">
                                                    <div className="d-flex align-items-center">
                                                        <i className="ri-error-warning-line fs-5 me-2"></i>
                                                        <span className="fs-14">
                                                            No hay zona definida. Ve a "Editar Zona" para crear una.
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ACTIVOS PARA FICHERO */}
                                            <div className="mb-3">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <h6 className="mb-0 text-success">
                                                        <i className="ri-user-location-line me-1"></i>
                                                        Activos para fichero
                                                    </h6>
                                                    <Badge color="success" pill>{stylistsInZone.length}</Badge>
                                                </div>

                                                {loading && (
                                                    <div className="text-center py-3">
                                                        <div className="spinner-border spinner-border-sm text-success" role="status">
                                                            <span className="visually-hidden">Cargando...</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                                    {!loading && stylistsInZone.length === 0 ? (
                                                        <div className="text-center py-3 text-muted bg-light rounded">
                                                            <i className="ri-user-search-line" style={{ fontSize: '32px' }}></i>
                                                            <p className="mt-2 mb-0 small">
                                                                {circleCenter
                                                                    ? 'No hay estilistas activos en esta zona'
                                                                    : 'Define una zona para ver estilistas'
                                                                }
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        stylistsInZone.map((stylist) => (
                                                            <div
                                                                key={stylist.id}
                                                                className={`d-flex align-items-center p-2 rounded mb-2 ${selectedStylist === stylist.id
                                                                    ? 'bg-success bg-opacity-10 border border-success'
                                                                    : 'bg-light'
                                                                    }`}
                                                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                                                onClick={() => centerOnStylist(stylist)}
                                                            >
                                                                <div style={{ position: 'relative' }} className="me-3">
                                                                    <div
                                                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                                        style={{ width: 45, height: 45, backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '14px' }}
                                                                    >
                                                                        {stylist.name.split(' ').map(n => n[0]).join('')}
                                                                    </div>
                                                                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, backgroundColor: '#10b981', border: '2px solid white', borderRadius: '50%' }} />
                                                                </div>
                                                                <div className="flex-grow-1 min-width-0">
                                                                    <span className="fw-medium text-truncate d-block">{stylist.name}</span>
                                                                    <small className="text-muted">{getConnectionTimeText(stylist)}</small>
                                                                </div>
                                                                <i className="ri-arrow-right-s-line text-success ms-2"></i>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* INACTIVOS PARA FICHERO */}
                                            <div className="border-top pt-3">
                                                <div className="d-flex align-items-center justify-content-between mb-2" style={{ cursor: 'pointer' }} onClick={() => setShowDisconnected(!showDisconnected)}>
                                                    <h6 className="mb-0 text-muted">
                                                        <i className="ri-user-unfollow-line me-1"></i>
                                                        Inactivos para fichero
                                                    </h6>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Badge color="secondary" pill>{stylistsOutZone.length}</Badge>
                                                        <i className={`ri-arrow-${showDisconnected ? 'up' : 'down'}-s-line text-muted`}></i>
                                                    </div>
                                                </div>

                                                <Collapse isOpen={showDisconnected}>
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {stylistsOutZone.map((stylist) => (
                                                            <div
                                                                key={stylist.id}
                                                                className={`d-flex align-items-center p-2 rounded mb-2 ${selectedStylist === stylist.id ? 'border border-warning' : 'bg-light opacity-75'}`}
                                                                style={{ cursor: stylist.lat ? 'pointer' : 'default' }}
                                                                onClick={() => stylist.lat && centerOnStylist(stylist)}
                                                            >
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: 40, height: 40, backgroundColor: stylist.lat ? '#f59e0b' : '#9ca3af', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                                                                    {stylist.name.split(' ').map(n => n[0]).join('')}
                                                                </div>
                                                                <div className="flex-grow-1 min-width-0">
                                                                    <span className="fw-medium text-truncate small d-block">{stylist.name}</span>
                                                                    <small className="text-muted" style={{ fontSize: '11px' }}>
                                                                        {stylist.lat ? getConnectionTimeText(stylist) : 'Sin GPS'}
                                                                    </small>
                                                                </div>
                                                                {stylist.lat && <i className="ri-map-pin-line text-warning ms-2"></i>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Collapse>
                                            </div>

                                            <div className="border-top pt-3 mt-3">
                                                <div className="text-muted" style={{ fontSize: '13px' }}>
                                                    <i className="ri-information-line me-1"></i>
                                                    Los estilistas se activan/inactivan en el fichero según su ubicación GPS
                                                </div>
                                            </div>
                                        </TabPane>

                                        {/* TAB: Editar Zona */}
                                        <TabPane tabId="edit">
                                            {!circleCenter && !isDrawing && (
                                                <div className="text-center py-4">
                                                    <i className="ri-map-pin-add-line text-primary" style={{ fontSize: '48px' }}></i>
                                                    <p className="mt-2 mb-3">No hay zona de cobertura definida</p>
                                                    <Button color="primary" onClick={startDrawing}>
                                                        <i className="ri-add-line me-1"></i>
                                                        Crear Zona
                                                    </Button>
                                                    <p className="text-muted mt-3 mb-0" style={{ fontSize: '14px' }}>
                                                        Define el área donde los estilistas<br />estarán activos para el fichero
                                                    </p>
                                                </div>
                                            )}

                                            {isDrawing && (
                                                <div className="text-center py-4">
                                                    <div className="alert alert-warning mb-3">
                                                        <i className="ri-cursor-line me-2"></i>
                                                        <strong>Haz clic en el mapa</strong> para colocar el centro de la zona
                                                    </div>
                                                    <Button color="secondary" outline onClick={() => setIsDrawing(false)}>
                                                        <i className="ri-close-line me-1"></i>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            )}

                                            {circleCenter && !isDrawing && (
                                                <>
                                                    <div className="alert alert-info mb-3 py-3">
                                                        <div className="d-flex align-items-center">
                                                            <i className="ri-drag-move-line fs-5 me-2"></i>
                                                            <span className="fs-14">
                                                                Usa el slider para ajustar el radio de la zona
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="small fw-medium">Radio de cobertura</Label>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Input type="range" min={100} max={1000} step={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-grow-1" />
                                                            <span className="text-muted fw-medium" style={{ minWidth: '65px' }}>{radius} m</span>
                                                        </div>
                                                        <div className="text-muted" style={{ fontSize: '13px' }}>
                                                            Los estilistas dentro de este radio estarán activos en el fichero
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="small fw-medium">Centro de la zona</Label>
                                                        <div className="bg-light p-2 rounded small text-muted font-monospace">
                                                            {circleCenter.lat.toFixed(6)}, {circleCenter.lng.toFixed(6)}
                                                        </div>
                                                    </div>

                                                    <div className="d-grid gap-2">
                                                        <Button color="light" size="sm" onClick={startDrawing}>
                                                            <i className="ri-map-pin-add-line me-1"></i>
                                                            Reubicar centro
                                                        </Button>
                                                        <Button color="light" size="sm" onClick={centerOnZone}>
                                                            <i className="ri-focus-3-line me-1"></i>
                                                            Centrar mapa en zona
                                                        </Button>
                                                        <Button color="danger" outline size="sm" onClick={deleteZone}>
                                                            <i className="ri-delete-bin-line me-1"></i>
                                                            Eliminar zona
                                                        </Button>
                                                        <hr className="my-2" />
                                                        <Button
                                                            color="success"
                                                            onClick={async () => {
                                                                if (!circleCenter) return;
                                                                try {
                                                                    await api.post('/stylists/geofence-config', {
                                                                        center_lat: circleCenter.lat,
                                                                        center_lng: circleCenter.lng,
                                                                        radius: radius
                                                                    });
                                                                    loadStylists();
                                                                    setActiveTab('list');
                                                                } catch (error) {
                                                                    console.error('Error guardando geocerca:', error);
                                                                }
                                                            }}
                                                        >
                                                            <i className="ri-save-line me-1"></i>
                                                            Guardar y ver estilistas
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </TabPane>
                                    </TabContent>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={8}>
                            <Card>
                                <CardBody className="p-0" style={{ position: 'relative' }}>
                                    {/* Drawing mode indicator */}
                                    {isDrawing && (
                                        <div style={{
                                            position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)',
                                            zIndex: 10, background: '#f7b84b', color: '#000', padding: '10px 20px',
                                            borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <i className="ri-focus-3-line"></i>
                                            Haz clic en el mapa para colocar la zona
                                        </div>
                                    )}

                                    {/* Legend */}
                                    {!isDrawing && (
                                        <div style={{
                                            position: 'absolute', top: 15, right: 15, zIndex: 10,
                                            background: 'white', padding: '12px 16px', borderRadius: '6px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '13px'
                                        }}>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <div style={{ width: 12, height: 12, backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 0 1px #10b981' }}></div>
                                                <span className="text-success fw-medium">Activo fichero ({stylistsInZone.length})</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <div style={{ width: 12, height: 12, backgroundColor: '#f59e0b', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 0 1px #f59e0b' }}></div>
                                                <span style={{ color: '#f59e0b' }} className="fw-medium">Fuera de zona ({stylistsOutZone.filter(s => s.lat).length})</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <div style={{ width: 12, height: 12, backgroundColor: '#9ca3af', borderRadius: '50%', border: '2px solid white' }}></div>
                                                <span className="text-muted">Sin GPS ({stylistsOutZone.filter(s => !s.lat).length})</span>
                                            </div>
                                        </div>
                                    )}

                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '600px' }}
                                            center={mapCenter}
                                            zoom={14}
                                            onClick={onMapClick}
                                            onLoad={(map) => { mapRef.current = map; }}
                                            options={{
                                                mapTypeControl: true,
                                                streetViewControl: false,
                                                fullscreenControl: true,
                                                zoomControl: true,
                                                gestureHandling: isDrawing ? 'none' : 'auto',
                                                draggableCursor: isDrawing ? 'crosshair' : undefined,
                                            }}
                                        >
                                            {/* Main geofence circle */}
                                            {circleCenter && (
                                                <GCircle
                                                    center={circleCenter}
                                                    radius={radius}
                                                    options={{
                                                        strokeColor: '#10b981',
                                                        strokeWeight: 3,
                                                        strokeOpacity: 0.8,
                                                        fillColor: '#10b981',
                                                        fillOpacity: 0.15,
                                                    }}
                                                />
                                            )}

                                            {/* Branch geofences */}
                                            {isPrimary && branchGeofences.map((bg) => (
                                                <GCircle
                                                    key={`branch-${bg.tenant_id}`}
                                                    center={bg.center}
                                                    radius={bg.radius}
                                                    options={{
                                                        strokeColor: bg.color,
                                                        strokeWeight: 2,
                                                        strokeOpacity: 0.6,
                                                        fillColor: bg.color,
                                                        fillOpacity: 0.08,
                                                    }}
                                                />
                                            ))}

                                            {/* ALL stylist markers */}
                                            {stylistsWithLocation.map((stylist) => (
                                                <StylistMarker
                                                    key={`marker-${stylist.id}`}
                                                    stylist={stylist}
                                                    isInZone={inZoneIds.has(stylist.id)}
                                                    isSelected={selectedStylist === stylist.id}
                                                    onClick={() => setSelectedStylist(stylist.id)}
                                                />
                                            ))}

                                            {/* Info window for selected stylist */}
                                            {selectedStylistData && (
                                                <InfoWindow
                                                    position={{ lat: selectedStylistData.lat, lng: selectedStylistData.lng }}
                                                    onCloseClick={() => setSelectedStylist(null)}
                                                    options={{ pixelOffset: new google.maps.Size(0, -30) }}
                                                >
                                                    <div style={{ minWidth: '180px', padding: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: '50%',
                                                                backgroundColor: inZoneIds.has(selectedStylistData.id) ? '#10b981' : '#f59e0b',
                                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: 'bold', fontSize: '13px', marginRight: '10px'
                                                            }}>
                                                                {selectedStylistData.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>{selectedStylistData.name}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {getConnectionTimeText(selectedStylistData)}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                backgroundColor: inZoneIds.has(selectedStylistData.id) ? '#d1fae5' : '#fef3c7',
                                                                color: inZoneIds.has(selectedStylistData.id) ? '#065f46' : '#92400e',
                                                                padding: '2px 8px', borderRadius: '12px', fontWeight: '500', marginLeft: 'auto'
                                                            }}>
                                                                {inZoneIds.has(selectedStylistData.id) ? 'Activo fichero' : 'Fuera de zona'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </InfoWindow>
                                            )}
                                        </GoogleMap>
                                    ) : (
                                        <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Cargando mapa...</span>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Geolocalizacion;
