// src/hooks/useGeoSocket.ts
// Real-time stylist location updates via Socket.IO
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface LocationUpdate {
  stylist_id: string;
  lat: number;
  lng: number;
  is_inside_geofence: boolean;
  geofence_event: "entry" | "exit" | null;
  timestamp: string;
}

type Params = {
  tenantId: string | number | undefined;
  onLocationUpdate: (data: LocationUpdate) => void;
};

export default function useGeoSocket({ tenantId, onLocationUpdate }: Params) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onLocationUpdate);

  useEffect(() => {
    callbackRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    if (!tenantId) return;

    const wsUrl = process.env.REACT_APP_API_WS_URL || "http://localhost:3005";

    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:tenant", tenantId);
    });

    socket.on("stylist:location-update", (data: LocationUpdate) => {
      callbackRef.current(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantId]);
}
