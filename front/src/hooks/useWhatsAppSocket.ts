// src/hooks/useWhatsAppSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type Handlers = {
  onNewHandoff?: (payload: any) => void;
  onNewMessage?: (payload: any) => void;
  onHandoffClosed?: (payload: any) => void;
  onConversationBlocked?: (payload: any) => void;
  onConversationUnblocked?: (payload: any) => void;
};

export default function useWhatsAppSocket(
  tenantId: string | string[] | undefined,
  handlers: Handlers
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Stable key for the dependency array
  const tenantKey = Array.isArray(tenantId) ? tenantId.sort().join(",") : tenantId || "";

  useEffect(() => {
    if (!tenantKey) return;

    const ids = Array.isArray(tenantId) ? tenantId : tenantId ? [tenantId] : [];
    if (ids.length === 0) return;

    const wsUrl = process.env.REACT_APP_API_WS_URL || "http://localhost:3005";
    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      ids.forEach(id => socket.emit("join:tenant", id));
    });

    socket.on("whatsapp:new-handoff", (data) => {
      handlersRef.current.onNewHandoff?.(data);
    });

    socket.on("whatsapp:new-message", (data) => {
      handlersRef.current.onNewMessage?.(data);
    });

    socket.on("whatsapp:handoff-closed", (data) => {
      handlersRef.current.onHandoffClosed?.(data);
    });

    socket.on("whatsapp:conversation-blocked", (data) => {
      handlersRef.current.onConversationBlocked?.(data);
    });

    socket.on("whatsapp:conversation-unblocked", (data) => {
      handlersRef.current.onConversationUnblocked?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey]);
}
