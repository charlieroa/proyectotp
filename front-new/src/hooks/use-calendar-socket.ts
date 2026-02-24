import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '@/lib/constants';

type SocketPayload = {
  type: 'created' | 'updated' | 'status' | 'cancelled';
  data: unknown;
};

type Params = {
  tenantId: string | number | undefined;
  onAnyChange: (payload: SocketPayload) => void;
};

export default function useCalendarSocket({ tenantId, onAnyChange }: Params) {
  const socketRef = useRef<Socket | null>(null);
  const onAnyChangeRef = useRef(onAnyChange);

  useEffect(() => {
    onAnyChangeRef.current = onAnyChange;
  }, [onAnyChange]);

  useEffect(() => {
    if (!tenantId) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:tenant', tenantId);
    });

    socket.on('appointment:created', (data) => {
      onAnyChangeRef.current({ type: 'created', data });
    });

    socket.on('appointment:updated', (data) => {
      onAnyChangeRef.current({ type: 'updated', data });
    });

    socket.on('appointment:status', (data) => {
      onAnyChangeRef.current({ type: 'status', data });
    });

    socket.on('appointment:cancelled', (data) => {
      onAnyChangeRef.current({ type: 'cancelled', data });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantId]);
}
