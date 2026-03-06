import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Row, Col, Card, CardBody, CardHeader, Button, Input, Spinner, Badge,
  ListGroup, ListGroupItem,
} from "reactstrap";
import { useSelector } from "react-redux";
import { api } from "../../services/api";
import useWhatsAppSocket from "../../hooks/useWhatsAppSocket";

interface Conversation {
  id: string;
  chat_id: string;
  client_name: string;
  client_phone: string;
  status: string;
  updated_at: string;
  last_message: { content: string; created_at: string; sender_type: string } | null;
}

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  created_at: string;
}

const WhatsAppInbox: React.FC = () => {
  const loginState = useSelector((s: any) => s.Login || {});
  const tenantId = useMemo(() => {
    const fromRedux = loginState?.user?.user?.tenant_id || loginState?.user?.tenant_id;
    if (fromRedux) return fromRedux;
    try {
      const stored = JSON.parse(sessionStorage.getItem("authUser") || "{}");
      if (stored?.user?.tenant_id) return stored.user.tenant_id;
      if (stored?.tenant_id) return stored.tenant_id;
    } catch {}
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.user?.tenant_id) return payload.user.tenant_id;
      }
    } catch {}
    return null;
  }, [loginState]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get(`/whatsapp-conversations/tenant/${tenantId}`);
      setConversations(data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }, [tenantId]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/whatsapp-conversations/${convId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
    else setMessages([]);
  }, [selectedId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket handlers
  useWhatsAppSocket(tenantId, {
    onNewHandoff: useCallback(() => {
      fetchConversations();
    }, [fetchConversations]),

    onNewMessage: useCallback((payload: any) => {
      // Update conversation list last_message
      setConversations(prev =>
        prev.map(c =>
          c.id === payload.conversationId
            ? { ...c, last_message: payload.message, updated_at: new Date().toISOString() }
            : c
        )
      );
      // Add message if viewing this conversation
      if (payload.conversationId === selectedId) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender_type: payload.message.sender_type,
          sender_name: payload.message.sender_name,
          content: payload.message.content,
          created_at: payload.message.created_at,
        }]);
      }
    }, [selectedId]),

    onHandoffClosed: useCallback((payload: any) => {
      setConversations(prev => prev.filter(c => c.id !== payload.conversationId));
      if (selectedId === payload.conversationId) {
        setSelectedId(null);
        setMessages([]);
      }
    }, [selectedId]),
  });

  // Send reply
  const handleSend = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      await api.post(`/whatsapp-conversations/${selectedId}/reply`, { message: reply.trim() });
      setReply("");
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSending(false);
    }
  };

  // Close conversation
  const handleClose = async () => {
    if (!selectedId) return;
    setClosing(true);
    try {
      await api.post(`/whatsapp-conversations/${selectedId}/close`);
    } catch (err) {
      console.error("Error closing conversation:", err);
    } finally {
      setClosing(false);
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const selectedConv = conversations.find(c => c.id === selectedId);

  return (
    <Row className="g-3" style={{ minHeight: 500 }}>
      {/* Left: Conversation List */}
      <Col md={4}>
        <Card className="h-100">
          <CardHeader className="d-flex align-items-center">
            <h6 className="mb-0 flex-grow-1">
              <i className="ri-whatsapp-line text-success me-1"></i>
              Conversaciones
              {conversations.length > 0 && (
                <Badge color="danger" className="ms-2" pill>{conversations.length}</Badge>
              )}
            </h6>
            <Button color="soft-primary" size="sm" onClick={fetchConversations}>
              <i className="ri-refresh-line"></i>
            </Button>
          </CardHeader>
          <CardBody className="p-0" style={{ overflowY: "auto", maxHeight: 500 }}>
            {conversations.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="ri-chat-check-line" style={{ fontSize: 40 }}></i>
                <p className="mt-2 mb-0">No hay conversaciones en espera</p>
              </div>
            ) : (
              <ListGroup flush>
                {conversations.map(c => (
                  <ListGroupItem
                    key={c.id}
                    action
                    active={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="border-0 border-bottom"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0">
                        <div
                          className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center"
                          style={{ width: 40, height: 40 }}
                        >
                          <i className="ri-user-line text-success fs-18"></i>
                        </div>
                      </div>
                      <div className="flex-grow-1 ms-2 overflow-hidden">
                        <div className="d-flex justify-content-between">
                          <h6 className="mb-0 text-truncate" style={{ maxWidth: 150 }}>
                            {c.client_name || "Cliente"}
                          </h6>
                          <small className="text-muted flex-shrink-0">
                            {c.updated_at ? timeAgo(c.updated_at) : ""}
                          </small>
                        </div>
                        <small className="text-muted">{c.client_phone}</small>
                        {c.last_message && (
                          <p className="mb-0 text-muted text-truncate" style={{ fontSize: 12 }}>
                            {c.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </ListGroupItem>
                ))}
              </ListGroup>
            )}
          </CardBody>
        </Card>
      </Col>

      {/* Right: Chat View */}
      <Col md={8}>
        <Card className="h-100">
          {selectedConv ? (
            <>
              <CardHeader className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="mb-0">
                    {selectedConv.client_name || "Cliente"}
                    <small className="text-muted ms-2">{selectedConv.client_phone}</small>
                  </h6>
                </div>
                <Button
                  color="danger"
                  size="sm"
                  onClick={handleClose}
                  disabled={closing}
                >
                  {closing ? <Spinner size="sm" /> : (
                    <><i className="ri-close-circle-line me-1"></i> Finalizar</>
                  )}
                </Button>
              </CardHeader>

              {/* Messages area */}
              <CardBody
                className="p-3"
                style={{ overflowY: "auto", maxHeight: 380, minHeight: 300, backgroundColor: "#f0f2f5" }}
              >
                {loading ? (
                  <div className="text-center py-5"><Spinner /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted py-5">Sin mensajes</div>
                ) : (
                  messages.map((m, i) => {
                    if (m.sender_type === "system") {
                      return (
                        <div key={i} className="text-center my-2">
                          <small className="text-muted bg-white px-2 py-1 rounded" style={{ fontSize: 11 }}>
                            {m.content}
                          </small>
                        </div>
                      );
                    }
                    const isAgent = m.sender_type === "agent" || m.sender_type === "bot";
                    return (
                      <div
                        key={i}
                        className={`d-flex mb-2 ${isAgent ? "justify-content-end" : "justify-content-start"}`}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "8px 12px",
                            borderRadius: isAgent ? "12px 12px 0 12px" : "12px 12px 12px 0",
                            backgroundColor: isAgent ? "#438eff" : "#ffffff",
                            color: isAgent ? "#fff" : "#333",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {!isAgent && (
                            <small style={{ fontWeight: 600, fontSize: 11, color: "#438eff" }}>
                              {m.sender_name}
                            </small>
                          )}
                          <p className="mb-0" style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
                            {m.content}
                          </p>
                          <small
                            style={{
                              fontSize: 10,
                              color: isAgent ? "rgba(255,255,255,0.7)" : "#999",
                              float: "right",
                              marginTop: 2,
                            }}
                          >
                            {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </small>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </CardBody>

              {/* Reply input */}
              <div className="p-3 border-top d-flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button color="success" onClick={handleSend} disabled={sending || !reply.trim()}>
                  {sending ? <Spinner size="sm" /> : <i className="ri-send-plane-fill"></i>}
                </Button>
              </div>
            </>
          ) : (
            <CardBody className="d-flex align-items-center justify-content-center text-center text-muted" style={{ minHeight: 500 }}>
              <div>
                <i className="ri-chat-3-line" style={{ fontSize: 60, opacity: 0.3 }}></i>
                <p className="mt-3 mb-0">Selecciona una conversación para responder</p>
              </div>
            </CardBody>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default WhatsAppInbox;
