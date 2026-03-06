import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardBody, Col, Container, Row, Label, Input, Button, Badge, Nav, NavItem, NavLink, TabContent, TabPane, Collapse } from 'reactstrap';
import { GoogleMap, LoadScript, Circle, Marker, InfoWindow } from '@react-google-maps/api';
import classnames from 'classnames';
import { api } from '../../services/api';
import { getIsPrimaryBranch } from '../../services/auth';

const containerStyle = {
    width: '100%',
    height: '600px'
};

const defaultCenter = {
    lat: 4.726518,
    lng: -74.034619
};

// Tipo para estilista
interface Stylist {
    id: number | string;
    name: string;
    specialty?: string;
    rating?: number;
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

// Función para calcular distancia entre dos puntos (Haversine)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Función para calcular tiempo relativo
const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
};

// Función para formatear hora
const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// Función para obtener texto de conexión/desconexión
const getConnectionTimeText = (stylist: Stylist): string => {
    if (stylist.status === 'connected' && stylist.connectedAt) {
        return `Conectado desde ${formatTime(stylist.connectedAt)}`;
    } else if (stylist.status === 'disconnected' && stylist.disconnectedAt) {
        return `Desconectado: ${formatTime(stylist.disconnectedAt)}`;
    } else if (stylist.last_location_update) {
        return `Última actualización: ${getRelativeTime(stylist.last_location_update)}`;
    }
    return 'Sin datos de ubicación';
};

const Geolocalizacion: React.FC = () => {
    document.title = "Geolocalización | Sistema de Peluquerías";

    const [activeTab, setActiveTab] = useState<string>('list');
    const [radius, setRadius] = useState<number>(200);
    const [circleCenter, setCircleCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [stylistsInZone, setStylistsInZone] = useState<Stylist[]>([]);
    const [stylistsOutZone, setStylistsOutZone] = useState<Stylist[]>([]);
    const [allStylists, setAllStylists] = useState<Stylist[]>([]);
    const [selectedStylist, setSelectedStylist] = useState<number | string | null>(null);
    const [openInfoWindow, setOpenInfoWindow] = useState<number | string | null>(null);
    const [mapLoaded, setMapLoaded] = useState<boolean>(false);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [showDisconnected, setShowDisconnected] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const isPrimary = getIsPrimaryBranch();
    const [branches, setBranches] = useState<{ id: string; name: string; branch_color: string; geofence?: { center: { lat: number; lng: number }; radius: number } }[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [branchGeofences, setBranchGeofences] = useState<{ tenant_id: string; name: string; color: string; center: { lat: number; lng: number }; radius: number }[]>([]);

    const circleRef = useRef<google.maps.Circle | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const isUpdatingRef = useRef<boolean>(false);

    // Cargar sucursales si es primary
    useEffect(() => {
        if (isPrimary) {
            loadBranches();
        }
    }, [isPrimary]);

    const loadBranches = async () => {
        try {
            const { data } = await api.get('/tenants/my-businesses');
            if (Array.isArray(data)) {
                setBranches(data);
                // Load geofences for all branches
                const geofences: typeof branchGeofences = [];
                for (const b of data) {
                    if (b.geofence_center_lat && b.geofence_center_lng) {
                        geofences.push({
                            tenant_id: b.id,
                            name: b.name,
                            color: b.branch_color || '#3788d8',
                            center: { lat: b.geofence_center_lat, lng: b.geofence_center_lng },
                            radius: b.geofence_radius || 200
                        });
                    }
                }
                setBranchGeofences(geofences);
            }
        } catch { /* ignore */ }
    };

    // Cargar estilistas y configuración de geocerca
    useEffect(() => {
        loadStylists();
        loadGeofenceConfig();

        // Actualizar cada 30 segundos
        const interval = setInterval(() => {
            loadStylists();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadStylists = async () => {
        try {
            const response = await api.get('/api/stylists/tracking');
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
            const response = await api.get('/api/stylists/geofence-config');
            const geofence = response.data.geofence;
            setCircleCenter(geofence.center);
            setRadius(geofence.radius);
            setMapCenter(geofence.center);
        } catch (error) {
            console.error('Error cargando configuración de geocerca:', error);
        }
    };

    // Filtrar estilistas dentro y fuera de la zona
    useEffect(() => {
        if (circleCenter && allStylists.length > 0) {
            const connected: Stylist[] = [];
            const disconnected: Stylist[] = [];

            allStylists.forEach(stylist => {
                // Solo procesar estilistas con ubicación
                if (!stylist.lat || !stylist.lng) {
                    disconnected.push(stylist);
                    return;
                }

                const distance = getDistance(circleCenter.lat, circleCenter.lng, stylist.lat, stylist.lng);
                const isInZone = distance <= radius;

                // Usar el estado del backend (is_inside_geofence) o calcularlo
                const updatedStylist: Stylist = {
                    ...stylist,
                    status: (stylist.status === 'connected' && isInZone) ? 'connected' : 'disconnected' as 'connected' | 'disconnected'
                };

                if (isInZone && stylist.status === 'connected') {
                    connected.push(updatedStylist);
                } else {
                    disconnected.push(updatedStylist);
                }
            });

            // Ordenar conectados por nombre, desconectados por última actualización
            connected.sort((a, b) => a.name.localeCompare(b.name));
            disconnected.sort((a, b) => {
                const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
                const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
                return timeB - timeA;
            });

            setStylistsInZone(connected);
            setStylistsOutZone(disconnected);
        } else if (allStylists.length > 0) {
            // Si no hay zona definida, todos están desconectados
            setStylistsInZone([]);
            setStylistsOutZone(allStylists);
        }
    }, [circleCenter, radius, allStylists]);

    const getCircleOptions = useCallback((): google.maps.CircleOptions => ({
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#10b981',
        fillOpacity: 0.15,
        clickable: false,
        draggable: activeTab === 'edit',
        editable: activeTab === 'edit',
        visible: true,
        zIndex: 1
    }), [activeTab]);

    const onLoadMap = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMapLoaded(true);
    }, []);

    const onLoadCircle = useCallback((circle: google.maps.Circle) => {
        if (circleRef.current && circleRef.current !== circle) {
            circleRef.current.setMap(null);
        }
        circleRef.current = circle;
    }, []);

    const onUnmountCircle = useCallback(() => {
        if (circleRef.current) {
            circleRef.current.setMap(null);
            circleRef.current = null;
        }
    }, []);

    const onCircleRadiusChange = useCallback(() => {
        if (circleRef.current && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            const newRadius = circleRef.current.getRadius();
            setRadius(newRadius);
            requestAnimationFrame(() => {
                isUpdatingRef.current = false;
            });
        }
    }, []);

    const onCircleCenterChange = useCallback(() => {
        if (circleRef.current && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            const newCenter = circleRef.current.getCenter();
            if (newCenter) {
                setCircleCenter({
                    lat: newCenter.lat(),
                    lng: newCenter.lng()
                });
            }
            requestAnimationFrame(() => {
                isUpdatingRef.current = false;
            });
        }
    }, []);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (isDrawing && e.latLng) {
            if (circleRef.current) {
                circleRef.current.setMap(null);
                circleRef.current = null;
            }
            const newCenter = {
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            };
            setCircleCenter(newCenter);
            setMapCenter(newCenter);
            setIsDrawing(false);
        }
    }, [isDrawing]);

    const handleRadiusInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRadius = Number(e.target.value);
        setRadius(newRadius);
        if (circleRef.current) {
            circleRef.current.setRadius(newRadius);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'connected') {
            return <Badge color="success" className="ms-2">Conectado</Badge>;
        }
        return <Badge color="secondary" className="ms-2">Desconectado</Badge>;
    };

    const getMarkerIcon = (stylist: Stylist, isSelected: boolean) => {
        // Crear un canvas para el avatar circular
        const canvas = document.createElement('canvas');
        const size = isSelected ? 56 : 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Sombra suave
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            // Círculo de fondo (verde para conectados)
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 3, 0, 2 * Math.PI);
            ctx.fill();

            // Reset shadow para el resto
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // Borde blanco o azul cuando seleccionado
            ctx.strokeStyle = isSelected ? '#405189' : '#ffffff';
            ctx.lineWidth = isSelected ? 5 : 4;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 3, 0, 2 * Math.PI);
            ctx.stroke();

            // Iniciales en blanco
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${size * 0.35}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initials = stylist.name.split(' ').map(n => n[0]).join('');
            ctx.fillText(initials, size / 2, size / 2);

            // Punto verde de conexión en la esquina inferior derecha (más grande y visible)
            const dotSize = size * 0.28;
            const dotX = size - dotSize / 2 - 2;
            const dotY = size - dotSize / 2 - 2;

            // Sombra del punto
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;

            // Punto verde
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // Borde blanco del punto (más grueso)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize / 2, 0, 2 * Math.PI);
            ctx.stroke();
        }

        return {
            url: canvas.toDataURL(),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
        };
    };

    const centerOnStylist = (stylist: Stylist) => {
        if (!stylist.lat || !stylist.lng) return;
        setSelectedStylist(stylist.id);
        setOpenInfoWindow(stylist.id);
        if (mapRef.current) {
            mapRef.current.panTo({ lat: stylist.lat, lng: stylist.lng });
            mapRef.current.setZoom(16);
        }
    };

    const startDrawing = () => {
        setIsDrawing(true);
    };

    const deleteZone = () => {
        if (circleRef.current) {
            circleRef.current.setMap(null);
            circleRef.current = null;
        }
        setCircleCenter(null);
        setRadius(200);
        setStylistsInZone([]);
    };

    const centerOnZone = () => {
        if (mapRef.current && circleCenter) {
            mapRef.current.panTo(circleCenter);
            mapRef.current.setZoom(14);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col lg={4}>
                            <Card>
                                <CardBody className="p-0">
                                    {/* Header con tabs */}
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
                                        {/* TAB: Lista de Estilistas */}
                                        <TabPane tabId="list">
                                            {/* Info de la zona actual */}
                                            {circleCenter ? (
                                                <div className="bg-success bg-opacity-10 border border-success rounded p-2 mb-3 d-flex align-items-center justify-content-between">
                                                    <small className="text-success fw-medium">
                                                        <i className="ri-checkbox-circle-line me-1"></i>
                                                        Zona activa · Radio: {(radius / 1000).toFixed(1)} km
                                                    </small>
                                                    <Button
                                                        color="link"
                                                        size="sm"
                                                        className="p-0 text-success"
                                                        onClick={() => setActiveTab('edit')}
                                                    >
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

                                            {/* ESTILISTAS CONECTADOS */}
                                            <div className="mb-3">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <h6 className="mb-0 text-success">
                                                        <i className="ri-user-location-line me-1"></i>
                                                        Conectados en zona
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
                                                                    ? 'No hay estilistas conectados en esta zona'
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
                                                                {/* Avatar con indicador verde */}
                                                                <div style={{ position: 'relative' }} className="me-3">
                                                                    <div
                                                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                                        style={{
                                                                            width: 45,
                                                                            height: 45,
                                                                            backgroundColor: '#10b981',
                                                                            color: 'white',
                                                                            fontWeight: 'bold',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        {stylist.name.split(' ').map(n => n[0]).join('')}
                                                                    </div>
                                                                    {/* Punto verde de conexión */}
                                                                    <div
                                                                        style={{
                                                                            position: 'absolute',
                                                                            bottom: 2,
                                                                            right: 2,
                                                                            width: 12,
                                                                            height: 12,
                                                                            backgroundColor: '#10b981',
                                                                            border: '2px solid white',
                                                                            borderRadius: '50%',
                                                                            boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-grow-1 min-width-0">
                                                                    <div className="d-flex align-items-center">
                                                                        <span className="fw-medium text-truncate">{stylist.name}</span>
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        {getConnectionTimeText(stylist)}
                                                                    </small>
                                                                </div>

                                                                {/* Flecha */}
                                                                <i className="ri-arrow-right-s-line text-success ms-2"></i>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* ESTILISTAS DESCONECTADOS */}
                                            <div className="border-top pt-3">
                                                <div
                                                    className="d-flex align-items-center justify-content-between mb-2"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setShowDisconnected(!showDisconnected)}
                                                >
                                                    <h6 className="mb-0 text-muted">
                                                        <i className="ri-user-unfollow-line me-1"></i>
                                                        Desconectados
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
                                                                className="d-flex align-items-center p-2 rounded mb-2 bg-light opacity-75"
                                                                style={{ cursor: 'default' }}
                                                            >
                                                                {/* Avatar gris */}
                                                                <div
                                                                    className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                                                                    style={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        backgroundColor: '#9ca3af',
                                                                        color: 'white',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '13px'
                                                                    }}
                                                                >
                                                                    {stylist.name.split(' ').map(n => n[0]).join('')}
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-grow-1 min-width-0">
                                                                    <div className="d-flex align-items-center">
                                                                        <span className="fw-medium text-truncate small">{stylist.name}</span>
                                                                    </div>
                                                                    <small className="text-muted" style={{ fontSize: '11px' }}>
                                                                        {getConnectionTimeText(stylist)}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Collapse>
                                            </div>

                                            {/* Footer info */}
                                            {stylistsInZone.length > 0 && (
                                                <div className="border-top pt-3 mt-3">
                                                    <div className="text-muted" style={{ fontSize: '13px' }}>
                                                        <i className="ri-information-line me-1"></i>
                                                        Los estilistas se conectan/desconectan automáticamente según su ubicación
                                                    </div>
                                                </div>
                                            )}
                                        </TabPane>

                                        {/* TAB: Editar Zona */}
                                        <TabPane tabId="edit">
                                            {/* Estado: Sin zona */}
                                            {!circleCenter && !isDrawing && (
                                                <div className="text-center py-4">
                                                    <i className="ri-map-pin-add-line text-primary" style={{ fontSize: '48px' }}></i>
                                                    <p className="mt-2 mb-3">No hay zona de cobertura definida</p>
                                                    <Button color="primary" onClick={startDrawing}>
                                                        <i className="ri-add-line me-1"></i>
                                                        Crear Zona
                                                    </Button>
                                                    <p className="text-muted mt-3 mb-0" style={{ fontSize: '14px' }}>
                                                        Define el área donde los estilistas<br />estarán conectados automáticamente
                                                    </p>
                                                </div>
                                            )}

                                            {/* Estado: Dibujando */}
                                            {isDrawing && (
                                                <div className="text-center py-4">
                                                    <div className="alert alert-warning mb-3">
                                                        <i className="ri-cursor-line me-2"></i>
                                                        <strong>Haz clic en el mapa</strong> para colocar el centro de la zona de cobertura
                                                    </div>
                                                    <Button color="secondary" outline onClick={() => setIsDrawing(false)}>
                                                        <i className="ri-close-line me-1"></i>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Estado: Zona creada - Modo edición */}
                                            {circleCenter && !isDrawing && (
                                                <>
                                                    <div className="alert alert-info mb-3 py-3">
                                                        <div className="d-flex align-items-center">
                                                            <i className="ri-drag-move-line fs-5 me-2"></i>
                                                            <span className="fs-14">
                                                                Arrastra el círculo o sus bordes en el mapa para ajustar la zona
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="small fw-medium">Radio de cobertura</Label>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Input
                                                                type="range"
                                                                min={100}
                                                                max={1000}
                                                                step={10}
                                                                value={radius}
                                                                onChange={handleRadiusInputChange}
                                                                className="flex-grow-1"
                                                            />
                                                            <span className="text-muted fw-medium" style={{ minWidth: '65px' }}>
                                                                {radius} m
                                                            </span>
                                                        </div>
                                                        <div className="text-muted" style={{ fontSize: '13px' }}>
                                                            Los estilistas dentro de este radio aparecerán como conectados
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
                                                                    await api.post('/api/stylists/geofence-config', {
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
                                    {/* Indicador de modo dibujo */}
                                    {isDrawing && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 15,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                zIndex: 10,
                                                background: '#f7b84b',
                                                color: '#000',
                                                padding: '10px 20px',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <i className="ri-focus-3-line"></i>
                                            Haz clic en el mapa para colocar la zona
                                        </div>
                                    )}

                                    {/* Leyenda de estados */}
                                    {!isDrawing && circleCenter && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 15,
                                                right: 15,
                                                zIndex: 10,
                                                background: 'white',
                                                padding: '12px 16px',
                                                borderRadius: '6px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <div style={{
                                                    width: 12,
                                                    height: 12,
                                                    backgroundColor: '#10b981',
                                                    borderRadius: '50%',
                                                    border: '2px solid white',
                                                    boxShadow: '0 0 0 1px #10b981'
                                                }}></div>
                                                <span className="text-success fw-medium">Conectado ({stylistsInZone.length})</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <div style={{
                                                    width: 12,
                                                    height: 12,
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '50%',
                                                    border: '2px solid white'
                                                }}></div>
                                                <span className="text-muted">Desconectado ({stylistsOutZone.length})</span>
                                            </div>
                                        </div>
                                    )}

                                    <LoadScript googleMapsApiKey="AIzaSyCuEj6zkmbIpmG6pFLnr83GfY3jI9ZPFho">
                                        <GoogleMap
                                            mapContainerStyle={{
                                                ...containerStyle,
                                                cursor: isDrawing ? 'crosshair' : 'default'
                                            }}
                                            center={mapCenter}
                                            zoom={13}
                                            onLoad={onLoadMap}
                                            onClick={onMapClick}
                                            options={{
                                                draggableCursor: isDrawing ? 'crosshair' : undefined,
                                                styles: [
                                                    {
                                                        featureType: "poi",
                                                        elementType: "labels",
                                                        stylers: [{ visibility: "off" }]
                                                    }
                                                ]
                                            }}
                                        >
                                            {/* Círculo de zona - solo si existe */}
                                            {circleCenter && (
                                                <Circle
                                                    key={`circle-${activeTab}-${circleCenter.lat}-${circleCenter.lng}`}
                                                    onLoad={onLoadCircle}
                                                    onUnmount={onUnmountCircle}
                                                    center={circleCenter}
                                                    radius={radius}
                                                    options={getCircleOptions()}
                                                    onRadiusChanged={onCircleRadiusChange}
                                                    onCenterChanged={onCircleCenterChange}
                                                />
                                            )}

                                            {/* Geofences de otras sucursales (solo para primary) */}
                                            {isPrimary && branchGeofences.map((bg) => (
                                                <Circle
                                                    key={`branch-circle-${bg.tenant_id}`}
                                                    center={bg.center}
                                                    radius={bg.radius}
                                                    options={{
                                                        strokeColor: bg.color,
                                                        strokeOpacity: 0.6,
                                                        strokeWeight: 2,
                                                        fillColor: bg.color,
                                                        fillOpacity: 0.08,
                                                        clickable: false,
                                                    }}
                                                />
                                            ))}

                                            {/* Marcadores SOLO de estilistas conectados (dentro de zona) con ubicación */}
                                            {mapLoaded && stylistsInZone.filter((s): s is Stylist & { lat: number; lng: number } => s.lat !== null && s.lng !== null).map((stylist) => (
                                                <React.Fragment key={`marker-fragment-${stylist.id}`}>
                                                    <Marker
                                                        key={`marker-${stylist.id}`}
                                                        position={{ lat: stylist.lat, lng: stylist.lng }}
                                                        icon={getMarkerIcon(stylist, selectedStylist === stylist.id)}
                                                        title={`${stylist.name} - ${stylist.specialty}`}
                                                        onClick={() => centerOnStylist(stylist)}
                                                    />

                                                    {/* InfoWindow que aparece al hacer clic */}
                                                    {openInfoWindow === stylist.id && (
                                                        <InfoWindow
                                                            position={{ lat: stylist.lat, lng: stylist.lng }}
                                                            onCloseClick={() => {
                                                                setOpenInfoWindow(null);
                                                                setSelectedStylist(null);
                                                            }}
                                                            options={{
                                                                pixelOffset: new google.maps.Size(0, -30)
                                                            }}
                                                        >
                                                            <div style={{ padding: '8px', minWidth: '200px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                                                    <div
                                                                        style={{
                                                                            width: 40,
                                                                            height: 40,
                                                                            borderRadius: '50%',
                                                                            backgroundColor: '#10b981',
                                                                            color: 'white',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontWeight: 'bold',
                                                                            fontSize: '14px',
                                                                            marginRight: '10px',
                                                                            position: 'relative'
                                                                        }}
                                                                    >
                                                                        {stylist.name.split(' ').map(n => n[0]).join('')}
                                                                        {/* Punto verde de conexión */}
                                                                        <div
                                                                            style={{
                                                                                position: 'absolute',
                                                                                bottom: 0,
                                                                                right: 0,
                                                                                width: 12,
                                                                                height: 12,
                                                                                backgroundColor: '#10b981',
                                                                                border: '2px solid white',
                                                                                borderRadius: '50%',
                                                                                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1f2937' }}>
                                                                            {stylist.name}
                                                                        </div>
                                                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                            {stylist.specialty}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    paddingTop: '8px',
                                                                    borderTop: '1px solid #e5e7eb'
                                                                }}>
                                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                        {getConnectionTimeText(stylist)}
                                                                    </span>
                                                                    <span style={{
                                                                        fontSize: '12px',
                                                                        backgroundColor: '#d1fae5',
                                                                        color: '#065f46',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontWeight: '500',
                                                                        marginLeft: 'auto'
                                                                    }}>
                                                                        Conectado
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </InfoWindow>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </GoogleMap>
                                    </LoadScript>
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