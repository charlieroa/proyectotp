import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container, Row, Col, Input, Button, Spinner,
} from "reactstrap";
import { useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { api } from "../../services/api";
import useWhatsAppSocket from "../../hooks/useWhatsAppSocket";
import { getMyBusinesses } from "../../services/tenantApi";
import { getRoleFromToken } from "../../services/auth";
import { selectTenantPlan } from "../../slices/Settings/settingsSlice";

/* ─── Types ─── */
interface Conversation {
  id: string;
  chat_id: string;
  client_name: string;
  client_phone: string;
  status: string;
  blocked?: boolean;
  assigned_to: string | null;
  updated_at: string;
  last_message: { content: string; created_at: string; sender_type: string } | null;
  tenant_id?: string;
  tenant_name?: string;
}

type TenantInfo = { id: string; name: string };

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  created_at: string;
}

/* ─── Helpers ─── */
const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const getInitials = (name: string) => {
  if (!name || name === "Cliente") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const GRADIENTS = [
  "linear-gradient(135deg, #3577f1, #2463d8)",
  "linear-gradient(135deg, #6559cc, #8b7fe8)",
  "linear-gradient(135deg, #299cdb, #4facfe)",
  "linear-gradient(135deg, #45CB85, #38d9a9)",
  "linear-gradient(135deg, #f672a7, #f093fb)",
  "linear-gradient(135deg, #02a8b5, #43e9c5)",
  "linear-gradient(135deg, #f1963b, #fbbf24)",
  "linear-gradient(135deg, #f06548, #ff8a65)",
];
const getGradient = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
};

const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "today";
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
};

/* ─── Inline styles as CSS string ─── */
const STYLES = `
  /* ── Sidebar panel ── */
  .msg-sidebar { background: #fff; }
  .msg-sidebar-header {
    background: linear-gradient(135deg, #3577f1 0%, #2463d8 100%);
    padding: 16px 16px 12px;
  }
  .msg-sidebar-header h5 { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -.2px; }
  .msg-sidebar-header .btn-refresh {
    width: 34px; height: 34px; border-radius: 50%; border: none;
    background: rgba(255,255,255,.15); color: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: all .2s; backdrop-filter: blur(4px);
  }
  .msg-sidebar-header .btn-refresh:hover { background: rgba(255,255,255,.28); transform: rotate(90deg); }

  /* ── Search ── */
  .msg-search-wrap { position: relative; padding: 0 12px; margin: -6px 0 4px; }
  .msg-search-wrap input {
    padding-left: 36px; padding-right: 32px; border-radius: 10px;
    border: 1px solid #e9ebec; font-size: 13px; background: #f3f6f9;
    height: 36px; transition: all .2s; color: #495057;
  }
  .msg-search-wrap input:focus { background: #fff; box-shadow: 0 0 0 2px rgba(53,119,241,.15); border-color: #3577f1; }
  .msg-search-wrap input::placeholder { color: #878a99; }
  .msg-search-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #878a99; font-size: 15px; transition: color .2s; }
  .msg-search-wrap input:focus ~ .msg-search-icon { color: #3577f1; }
  .msg-search-clear { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); border: none; background: none; color: #878a99; font-size: 14px; padding: 0; cursor: pointer; transition: color .15s; line-height: 1; }
  .msg-search-clear:hover { color: #495057; }

  /* ── Filter pills ── */
  .msg-filters { display: flex; gap: 6px; padding: 8px 12px 4px; }
  .msg-filter-btn {
    border: none; border-radius: 18px; padding: 5px 14px;
    font-size: 12px; font-weight: 600; transition: all .2s;
    cursor: pointer; display: flex; align-items: center; gap: 5px;
  }
  .msg-filter-btn.active-all { background: #3577f1; color: #fff; }
  .msg-filter-btn.active-handoff { background: #f06548; color: #fff; }
  .msg-filter-btn.active-pending { background: #f1963b; color: #fff; }
  .msg-filter-btn.inactive { background: #f3f6f9; color: #495057; border: 1px solid #e9ebec; }
  .msg-filter-btn.inactive:hover { background: #eff2f7; color: #343a40; }
  .msg-filter-count { font-size: 10px; background: rgba(255,255,255,.3); padding: 1px 7px; border-radius: 10px; font-weight: 700; line-height: 1.5; }
  .msg-filter-count.inactive { background: #e9ebec; color: #878a99; }

  /* ── Conversation list ── */
  .msg-conv-list { flex: 1; overflow-y: auto; }
  .msg-conv-list::-webkit-scrollbar { width: 6px; }
  .msg-conv-list::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 3px; }
  .msg-conv-list::-webkit-scrollbar-thumb:hover { background: #adb5bd; }

  .msg-conv-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 14px;
    cursor: pointer; transition: background .15s ease; position: relative;
  }
  .msg-conv-item::after {
    content: ''; position: absolute; bottom: 0; right: 14px; left: 76px;
    height: 1px; background: #eff2f7;
  }
  .msg-conv-item:last-child::after { display: none; }
  .msg-conv-item:hover { background: #f3f6f9; }
  .msg-conv-item.active { background: #eff2f7; }
  .msg-conv-item.handoff { background: linear-gradient(90deg, rgba(240,101,72,.04) 0%, transparent 40%); }
  .msg-conv-item.handoff.active { background: linear-gradient(90deg, rgba(240,101,72,.08) 0%, #eff2f7 40%); }
  .msg-conv-item.pending { background: linear-gradient(90deg, rgba(241,150,59,.06) 0%, transparent 40%); }
  .msg-conv-item.pending.active { background: linear-gradient(90deg, rgba(241,150,59,.10) 0%, #eff2f7 40%); }

  /* ── Avatar ── */
  .msg-avatar {
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 15px; flex-shrink: 0;
    letter-spacing: .5px; position: relative;
  }
  .msg-avatar-sm { width: 36px; height: 36px; font-size: 13px; }
  .msg-avatar-ring { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #3577f1; }
  .msg-avatar-ring.live { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #f06548; }
  .msg-avatar-ring.pending { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #f1963b; }
  .msg-online-dot { position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid #fff; background: #45CB85; }

  /* ── Conversation content ── */
  .msg-conv-name { font-size: 14.5px; font-weight: 500; color: #212529; line-height: 1.3; }
  .msg-conv-time { font-size: 12px; white-space: nowrap; font-weight: 400; }
  .msg-conv-time.handoff { color: #f06548; font-weight: 600; }
  .msg-conv-time.pending { color: #f1963b; font-weight: 600; }
  .msg-conv-time.normal { color: #878a99; }
  .msg-conv-preview { font-size: 13px; color: #878a99; line-height: 1.35; display: flex; align-items: center; gap: 3px; }
  .msg-conv-preview i { font-size: 14px; color: #adb5bd; flex-shrink: 0; }

  .msg-badge-live {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; color: #fff; background: #f06548;
    padding: 2px 8px 2px 6px; border-radius: 10px;
    font-weight: 700; letter-spacing: .3px; white-space: nowrap;
  }
  .msg-badge-pending {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; color: #fff; background: #f1963b;
    padding: 2px 8px 2px 6px; border-radius: 10px;
    font-weight: 700; letter-spacing: .3px; white-space: nowrap;
    animation: pulse-pending 2s infinite;
  }
  @keyframes pulse-pending { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

  .msg-unread-badge {
    min-width: 20px; height: 20px; border-radius: 10px;
    background: #3577f1; color: #fff; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; padding: 0 5px;
  }

  /* ── Chat bubbles ── */
  .msg-bubble { padding: 6px 9px 6px 9px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .msg-bubble-client { background: #fff; border-radius: 0 10px 10px 10px; border: 1px solid #eff2f7; }
  .msg-bubble-bot { background: #f3f6f9; border-radius: 10px 0 10px 10px; border: 1px solid #e9ebec; }
  .msg-bubble-agent { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 10px 0 10px 10px; }
  .msg-time { font-size: 11px; color: #878a99; float: right; margin: 4px 0 -2px 12px; white-space: nowrap; }
  .msg-system {
    display: inline-block; background: #fff4e6; color: #e8590c;
    padding: 5px 16px; border-radius: 10px; font-size: 12px;
    font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .msg-date-pill {
    display: inline-block; background: rgba(255,255,255,.95); color: #495057;
    padding: 5px 16px; border-radius: 10px; font-size: 12px;
    font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }

  /* ── Chat area ── */
  .msg-chat-bg {
    background-color: #f3f6f9;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 5v10M5 20h10M25 20h10M20 25v10' stroke='%23dde1e6' stroke-width='.5' stroke-linecap='round' opacity='.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23p)' width='200' height='200'/%3E%3C/svg%3E");
  }
  .msg-header-bar { background: #fff; border-bottom: 1px solid #eff2f7; }
  .msg-empty-state { background: linear-gradient(160deg, #f8f9fa 0%, #eff2f7 100%); }

  /* ── Send area ── */
  .msg-send-btn {
    width: 42px; height: 42px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: none; transition: all .2s;
  }
  .msg-send-btn:not(:disabled) { background: #3577f1; color: #fff; }
  .msg-send-btn:not(:disabled):hover { background: #2463d8; }
  .msg-send-btn:disabled { background: #e9ebec; color: #adb5bd; }

  /* ── Animations ── */
  .msg-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; display: inline-block; animation: live-pulse 1.5s infinite; }
  .msg-live-dot.orange { background: #f1963b; }
  .msg-live-dot.red { background: #f06548; }
  @keyframes live-pulse { 0%,100%{ opacity:1; transform:scale(1) } 50%{ opacity:.4; transform:scale(.7) } }
  @keyframes slide-in { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  .msg-conv-item { animation: slide-in .2s ease; }

  /* ── Tenant badge (subtle) ── */
  .msg-tenant-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 500; color: #878a99;
    white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis;
  }
  .msg-tenant-badge-dot {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  }

  /* ── Tenant select ── */
  .msg-tenant-select-wrap { padding: 4px 12px 2px; }
  .msg-tenant-select {
    width: 100%; height: 30px; border-radius: 8px;
    border: 1px solid #e9ebec; background: #f8f9fa;
    font-size: 12px; font-weight: 600; color: #495057;
    padding: 0 28px 0 10px; cursor: pointer;
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23878a99' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    transition: all .15s;
  }
  .msg-tenant-select:hover { border-color: #ced4da; background: #eff2f7; }
  .msg-tenant-select:focus { outline: none; border-color: #3577f1; box-shadow: 0 0 0 2px rgba(53,119,241,.12); background: #fff; }

  /* ── Blocked styling ── */
  .msg-conv-item.blocked { opacity: .55; }
  .msg-conv-item.blocked .msg-conv-name { text-decoration: line-through; }
  .msg-badge-blocked {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; color: #fff; background: #212529;
    padding: 2px 8px 2px 6px; border-radius: 10px;
    font-weight: 700; letter-spacing: .3px; white-space: nowrap;
  }

  /* ── Empty state ── */
  .msg-empty-sidebar {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 40px 24px; text-align: center; flex: 1;
  }
  .msg-empty-sidebar-icon {
    width: 72px; height: 72px; border-radius: 50%;
    background: linear-gradient(135deg, #eef2ff, #dbe4ff);
    display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
  }
`;

/* ─── Tenant colors for multi-tenant badges ─── */
const TENANT_COLORS = [
  "#3577f1", "#6559cc", "#299cdb", "#45CB85", "#f672a7",
  "#02a8b5", "#f1963b", "#f06548", "#8b7fe8", "#38d9a9",
];
const getTenantColor = (idx: number) => TENANT_COLORS[idx % TENANT_COLORS.length];

/* ─── Component ─── */
const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const loginState = useSelector((s: any) => s.Login || {});
  const tenantPlan = useSelector(selectTenantPlan);
  const roleId = getRoleFromToken();
  const isAdmin = roleId === 1;
  const isEnterprise = tenantPlan === "enterprise";
  const isMultiTenant = isAdmin && isEnterprise;

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
        const p = JSON.parse(atob(token.split(".")[1]));
        if (p?.user?.tenant_id) return p.user.tenant_id;
      }
    } catch {}
    return null;
  }, [loginState]);

  const [filter, setFilter] = useState<"all" | "handoff" | "pending">("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [taking, setTaking] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-tenant state
  const [allTenants, setAllTenants] = useState<TenantInfo[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string | "all">("all");

  // Fetch businesses for enterprise admin
  useEffect(() => {
    if (!isMultiTenant) return;
    getMyBusinesses()
      .then(res => {
        const tenants = (res.data || []).map((b: any) => ({ id: b.id, name: b.name }));
        setAllTenants(tenants);
      })
      .catch(() => {});
  }, [isMultiTenant]);

  // All tenant IDs for socket subscription
  const allTenantIds = useMemo(() => {
    if (isMultiTenant && allTenants.length > 1) return allTenants.map(tn => tn.id);
    return tenantId ? [tenantId] : [];
  }, [isMultiTenant, allTenants, tenantId]);

  const fetchConversations = useCallback(async () => {
    if (!tenantId) return;
    setLoadingConvs(true);
    try {
      const statusParam = filter === "pending" ? "handoff" : filter;

      // If multi-tenant with multiple businesses, fetch from all
      if (isMultiTenant && allTenants.length > 1) {
        const results = await Promise.allSettled(
          allTenants.map(tn =>
            api.get(`/whatsapp-conversations/tenant/${tn.id}?status=${statusParam}`)
              .then(res => (res.data || []).map((c: any) => ({ ...c, tenant_id: tn.id, tenant_name: tn.name })))
          )
        );
        const merged: Conversation[] = [];
        results.forEach(r => { if (r.status === "fulfilled") merged.push(...r.value); });
        setConversations(merged);
      } else {
        const { data } = await api.get(`/whatsapp-conversations/tenant/${tenantId}?status=${statusParam}`);
        setConversations(data.map((c: any) => ({ ...c, tenant_id: tenantId })));
      }
    } catch (err) { console.error(err); }
    finally { setLoadingConvs(false); }
  }, [tenantId, filter, isMultiTenant, allTenants]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/whatsapp-conversations/${convId}/messages`);
      setMessages(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { const t = setInterval(fetchConversations, 30000); return () => clearInterval(t); }, [fetchConversations]);
  useEffect(() => { if (selectedId) fetchMessages(selectedId); else setMessages([]); }, [selectedId, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { document.title = `${t("messages")} | Tupelukeria`; }, [t]);

  useWhatsAppSocket(allTenantIds.length > 0 ? (allTenantIds.length === 1 ? allTenantIds[0] : allTenantIds) : undefined, {
    onNewHandoff: useCallback(() => { fetchConversations(); }, [fetchConversations]),
    onNewMessage: useCallback((p: any) => {
      setConversations(prev => prev.map(c =>
        c.id === p.conversationId ? { ...c, last_message: p.message, updated_at: new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      if (p.conversationId === selectedId) {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender_type: p.message.sender_type, sender_name: p.message.sender_name, content: p.message.content, created_at: p.message.created_at }]);
      }
    }, [selectedId]),
    onHandoffClosed: useCallback((p: any) => {
      setConversations(prev => prev.map(c => c.id === p.conversationId ? { ...c, status: "bot" } : c));
      if (selectedId === p.conversationId) fetchMessages(p.conversationId);
    }, [selectedId, fetchMessages]),
    onConversationBlocked: useCallback((p: any) => {
      setConversations(prev => prev.map(c => c.id === p.conversationId ? { ...c, blocked: true, status: "bot" } : c));
      if (selectedId === p.conversationId) fetchMessages(p.conversationId);
    }, [selectedId, fetchMessages]),
    onConversationUnblocked: useCallback((p: any) => {
      setConversations(prev => prev.map(c => c.id === p.conversationId ? { ...c, blocked: false } : c));
      if (selectedId === p.conversationId) fetchMessages(p.conversationId);
    }, [selectedId, fetchMessages]),
  });

  const handleSend = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try { await api.post(`/whatsapp-conversations/${selectedId}/reply`, { message: reply.trim() }); setReply(""); }
    catch (e) { console.error(e); } finally { setSending(false); }
  };
  const handleClose = async () => {
    if (!selectedId) return;
    setClosing(true);
    try { await api.post(`/whatsapp-conversations/${selectedId}/close`); }
    catch (e) { console.error(e); } finally { setClosing(false); }
  };
  const handleTake = async () => {
    if (!selectedId) return;
    setTaking(true);
    try {
      await api.post(`/whatsapp-conversations/${selectedId}/take`);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status: "handoff" } : c));
      fetchMessages(selectedId);
    } catch (e) { console.error(e); } finally { setTaking(false); }
  };

  const handleBlock = async () => {
    if (!selectedId) return;
    if (!window.confirm(t("block_client_confirm"))) return;
    setBlocking(true);
    try {
      await api.post(`/whatsapp-conversations/${selectedId}/block`);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, blocked: true, status: "bot" } : c));
      fetchMessages(selectedId);
    } catch (e) { console.error(e); } finally { setBlocking(false); }
  };
  const handleUnblock = async () => {
    if (!selectedId) return;
    setBlocking(true);
    try {
      await api.post(`/whatsapp-conversations/${selectedId}/unblock`);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, blocked: false } : c));
      fetchMessages(selectedId);
    } catch (e) { console.error(e); } finally { setBlocking(false); }
  };

  const selectedConv = conversations.find(c => c.id === selectedId);

  // Priority sort: pending handoff first, then active handoff, then by date
  const sortedConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const aPending = a.status === "handoff" && !a.assigned_to;
      const bPending = b.status === "handoff" && !b.assigned_to;
      const aHandoff = a.status === "handoff" && !!a.assigned_to;
      const bHandoff = b.status === "handoff" && !!b.assigned_to;

      // Pending first
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      // Then active handoff
      if (aHandoff && !bHandoff && !bPending) return -1;
      if (!aHandoff && !aPending && bHandoff) return 1;
      // Then by date
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return sorted;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let list = sortedConversations;
    if (filter === "pending") {
      list = list.filter(c => c.status === "handoff" && !c.assigned_to);
    }
    // Multi-tenant filter
    if (tenantFilter !== "all") {
      list = list.filter(c => c.tenant_id === tenantFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      (c.client_name || "").toLowerCase().includes(q) ||
      (c.client_phone || "").toLowerCase().includes(q) ||
      (c.tenant_name || "").toLowerCase().includes(q)
    );
  }, [sortedConversations, search, filter, tenantFilter]);

  const handoffCount = useMemo(() => conversations.filter(c => c.status === "handoff").length, [conversations]);
  const pendingCount = useMemo(() => conversations.filter(c => c.status === "handoff" && !c.assigned_to).length, [conversations]);

  const tenantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach(c => { if (c.tenant_id) counts[c.tenant_id] = (counts[c.tenant_id] || 0) + 1; });
    return counts;
  }, [conversations]);

  const getConvStatus = (c: Conversation) => {
    if (c.status === "handoff" && !c.assigned_to) return "pending";
    if (c.status === "handoff") return "handoff";
    return "bot";
  };

  return (
    <div className="page-content" style={{ paddingBottom: 0 }}>
      <style>{STYLES}</style>
      <Container fluid>
        <div className="card mb-0 overflow-hidden" style={{ height: "calc(100vh - 130px)", minHeight: 520, borderRadius: 12, border: "1px solid #e9ebec", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <Row className="g-0 h-100">

            {/* ═══════ LEFT PANEL ═══════ */}
            <Col md={4} lg={3} className="msg-sidebar d-flex flex-column h-100" style={{ borderRight: "1px solid #eff2f7" }}>
              {/* Header */}
              <div className="msg-sidebar-header">
                <div className="d-flex align-items-center">
                  <h5 className="mb-0">
                    <i className="ri-message-3-line me-2"></i>{t("messages")}
                  </h5>
                  <button
                    className="btn-refresh ms-auto"
                    onClick={fetchConversations}
                    disabled={loadingConvs}
                  >
                    <i className={loadingConvs ? "ri-loader-4-line" : "ri-refresh-line"} style={{ fontSize: 16 }}></i>
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="msg-search-wrap" style={{ paddingTop: 10, paddingBottom: 2 }}>
                <Input
                  type="text"
                  placeholder={t("search_conversation")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <i className="ri-search-line msg-search-icon"></i>
                {search && (
                  <button className="msg-search-clear" onClick={() => setSearch("")}>
                    <i className="ri-close-line"></i>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="msg-filters">
                <button
                  className={`msg-filter-btn ${filter === "all" ? "active-all" : "inactive"}`}
                  onClick={() => setFilter("all")}
                >
                  <i className="ri-chat-3-line" style={{ fontSize: 13 }}></i>
                  {t("all")}
                  <span className={`msg-filter-count ${filter !== "all" ? "inactive" : ""}`}>{conversations.length}</span>
                </button>
                {pendingCount > 0 && (
                  <button
                    className={`msg-filter-btn ${filter === "pending" ? "active-pending" : "inactive"}`}
                    onClick={() => setFilter("pending")}
                  >
                    <i className="ri-alarm-warning-line" style={{ fontSize: 13 }}></i>
                    {t("waiting")}
                    <span className={`msg-filter-count ${filter !== "pending" ? "inactive" : ""}`}>{pendingCount}</span>
                  </button>
                )}
                <button
                  className={`msg-filter-btn ${filter === "handoff" ? "active-handoff" : "inactive"}`}
                  onClick={() => setFilter("handoff")}
                >
                  <i className="ri-user-voice-line" style={{ fontSize: 13 }}></i>
                  {t("live")}
                  {handoffCount > 0 && (
                    <span className={`msg-filter-count ${filter !== "handoff" ? "inactive" : ""}`}>{handoffCount}</span>
                  )}
                </button>
              </div>

              {/* Tenant filter (enterprise multi-tenant) */}
              {isMultiTenant && allTenants.length > 1 && (
                <div className="msg-tenant-select-wrap">
                  <select
                    className="msg-tenant-select"
                    value={tenantFilter}
                    onChange={e => setTenantFilter(e.target.value)}
                  >
                    <option value="all">{t("all_salons")} ({conversations.length})</option>
                    {allTenants.map(tn => (
                      <option key={tn.id} value={tn.id}>
                        {tn.name} ({tenantCounts[tn.id] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conversation list */}
              <div className="msg-conv-list">
                {loadingConvs && conversations.length === 0 ? (
                  <div className="text-center py-5"><Spinner size="sm" color="secondary" /></div>
                ) : filteredConversations.length === 0 ? (
                  <div className="msg-empty-sidebar">
                    <div className="msg-empty-sidebar-icon">
                      <i className="ri-chat-smile-3-line" style={{ fontSize: 30, color: "#3577f1" }}></i>
                    </div>
                    <p className="mb-1 fw-medium" style={{ fontSize: 15, color: "#343a40" }}>Sin conversaciones</p>
                    <small style={{ color: "#878a99", lineHeight: 1.5 }}>
                      Los chats apareceran aqui automaticamente
                    </small>
                  </div>
                ) : (
                  filteredConversations.map(c => {
                    const isActive = selectedId === c.id;
                    const convStatus = getConvStatus(c);
                    const isPending = convStatus === "pending";
                    const isHandoff = convStatus === "handoff";
                    const isBlocked = c.blocked === true;
                    const grad = getGradient(c.client_name || c.client_phone);
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`msg-conv-item ${isActive ? "active" : ""} ${isPending ? "pending" : isHandoff ? "handoff" : ""} ${isBlocked ? "blocked" : ""}`}
                      >
                        {/* Avatar */}
                        <div className="position-relative">
                          <div
                            className={`msg-avatar ${isPending ? "msg-avatar-ring pending" : isHandoff ? "msg-avatar-ring live" : ""}`}
                            style={{ background: grad }}
                          >
                            {getInitials(c.client_name || c.client_phone)}
                          </div>
                          {!isPending && !isHandoff && <span className="msg-online-dot" />}
                        </div>

                        {/* Content */}
                        <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                          {/* Row 1: Name + Time */}
                          <div className="d-flex justify-content-between align-items-baseline">
                            <span className="msg-conv-name text-truncate d-flex align-items-center gap-1">
                              {c.client_name || t("client")}
                              {isMultiTenant && c.tenant_name && allTenants.length > 1 && (() => {
                                const tIdx = allTenants.findIndex(tn => tn.id === c.tenant_id);
                                const color = getTenantColor(tIdx >= 0 ? tIdx : 0);
                                return (
                                  <span className="msg-tenant-badge">
                                    <span className="msg-tenant-badge-dot" style={{ background: color }}></span>
                                    {c.tenant_name}
                                  </span>
                                );
                              })()}
                            </span>
                            <span className={`msg-conv-time ${isPending ? "pending" : isHandoff ? "handoff" : "normal"}`}>
                              {c.updated_at ? timeAgo(c.updated_at) : ""}
                            </span>
                          </div>

                          {/* Row 2: Preview + Badge */}
                          <div className="d-flex justify-content-between align-items-center" style={{ marginTop: 2 }}>
                            <div className="msg-conv-preview text-truncate" style={{ flex: 1, minWidth: 0 }}>
                              {c.last_message ? (
                                <>
                                  {c.last_message.sender_type === "bot" && <i className="ri-robot-line"></i>}
                                  {c.last_message.sender_type === "agent" && <i className="ri-shield-user-line"></i>}
                                  {c.last_message.sender_type === "client" && <i className="ri-user-3-line"></i>}
                                  <span className="text-truncate">{c.last_message.content}</span>
                                </>
                              ) : (
                                <span style={{ color: "#adb5bd", fontStyle: "italic" }}>{t("no_messages")}</span>
                              )}
                            </div>
                            <div className="flex-shrink-0 ms-2">
                              {isBlocked ? (
                                <span className="msg-badge-blocked">
                                  <i className="ri-forbid-line" style={{ fontSize: 10 }}></i>{t("blocked").toUpperCase()}
                                </span>
                              ) : isPending ? (
                                <span className="msg-badge-pending">
                                  <span className="msg-live-dot orange"></span>{t("waiting").toUpperCase()}
                                </span>
                              ) : isHandoff ? (
                                <span className="msg-badge-live">
                                  <span className="msg-live-dot"></span>{t("live").toUpperCase()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Col>

            {/* ═══════ RIGHT PANEL ═══════ */}
            <Col md={8} lg={9} className="d-flex flex-column h-100">
              {selectedConv ? (
                <>
                  {/* Chat header */}
                  <div className="msg-header-bar px-3 py-2 d-flex align-items-center gap-3">
                    <div className="position-relative">
                      <div
                        className={`msg-avatar msg-avatar-sm ${
                          getConvStatus(selectedConv) === "pending" ? "msg-avatar-ring pending" :
                          getConvStatus(selectedConv) === "handoff" ? "msg-avatar-ring live" : ""
                        }`}
                        style={{ background: getGradient(selectedConv.client_name || selectedConv.client_phone) }}
                      >
                        {getInitials(selectedConv.client_name || selectedConv.client_phone)}
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0 fw-semibold" style={{ fontSize: 15, color: "#212529" }}>
                          {selectedConv.client_name || t("client")}
                        </h6>
                        {selectedConv.blocked ? (
                          <span className="msg-badge-blocked">
                            <i className="ri-forbid-line" style={{ fontSize: 10 }}></i>{t("blocked")}
                          </span>
                        ) : getConvStatus(selectedConv) === "pending" ? (
                          <span className="msg-badge-pending">
                            <span className="msg-live-dot orange"></span>{t("waiting_advisor")}
                          </span>
                        ) : getConvStatus(selectedConv) === "handoff" ? (
                          <span className="msg-badge-live">
                            <span className="msg-live-dot"></span>{t("live")}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#3577f1", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <i className="ri-robot-line" style={{ fontSize: 12 }}></i>{t("bot_active")}
                          </span>
                        )}
                      </div>
                      <small style={{ fontSize: 12.5, color: "#878a99" }}>
                        {selectedConv.client_phone}
                        {isMultiTenant && selectedConv.tenant_name && allTenants.length > 1 && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: getTenantColor(allTenants.findIndex(tn => tn.id === selectedConv.tenant_id)) }}>
                            <i className="ri-store-2-line me-1" style={{ fontSize: 11 }}></i>{selectedConv.tenant_name}
                          </span>
                        )}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      {selectedConv.blocked ? (
                        <Button
                          size="sm"
                          style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#45CB85", border: "none", padding: "6px 18px" }}
                          onClick={handleUnblock}
                          disabled={blocking}
                        >
                          {blocking ? <Spinner size="sm" /> : <><i className="ri-lock-unlock-line me-1"></i>{t("unblock")}</>}
                        </Button>
                      ) : (
                        <>
                          {getConvStatus(selectedConv) !== "handoff" && (
                            <Button
                              size="sm"
                              style={{
                                borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: "#3577f1", border: "none", padding: "6px 18px",
                              }}
                              onClick={handleTake}
                              disabled={taking}
                            >
                              {taking ? <Spinner size="sm" /> : <><i className="ri-hand-heart-line me-1"></i>{t("take")}</>}
                            </Button>
                          )}
                          {selectedConv.status === "handoff" && (
                            <Button
                              size="sm" outline color="danger"
                              style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "6px 18px" }}
                              onClick={handleClose}
                              disabled={closing}
                            >
                              {closing ? <Spinner size="sm" /> : <><i className="ri-close-circle-line me-1"></i>{t("finish")}</>}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Messages area */}
                  <div className="flex-grow-1 px-3 px-lg-4 py-2 msg-chat-bg" style={{ overflowY: "auto" }}>
                    {loading ? (
                      <div className="text-center py-5"><Spinner color="secondary" /></div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-5">
                        <span className="msg-date-pill">{t("no_messages_conversation")}</span>
                      </div>
                    ) : (
                      messages.map((m, i) => {
                        const showDate = i === 0 || getDateLabel(m.created_at) !== getDateLabel(messages[i - 1].created_at);
                        return (
                          <React.Fragment key={m.id || i}>
                            {showDate && (
                              <div className="text-center my-3">
                                <span className="msg-date-pill">{getDateLabel(m.created_at)}</span>
                              </div>
                            )}
                            {m.sender_type === "system" ? (
                              <div className="text-center my-2">
                                <span className="msg-system">{m.content}</span>
                              </div>
                            ) : (() => {
                              const isClient = m.sender_type === "client";
                              const isBot = m.sender_type === "bot";
                              const bubbleClass = isClient ? "msg-bubble-client" : isBot ? "msg-bubble-bot" : "msg-bubble-agent";
                              return (
                                <div className={`d-flex mb-1 ${isClient ? "justify-content-start" : "justify-content-end"}`}>
                                  <div className={`msg-bubble ${bubbleClass}`} style={{ maxWidth: "65%", minWidth: 80 }}>
                                    {!isClient && (
                                      <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2, color: isBot ? "#3577f1" : "#6559cc" }}>
                                        {isBot ? <><i className="ri-robot-line me-1" style={{ fontSize: 11 }}></i>Bot</> : <><i className="ri-shield-user-line me-1" style={{ fontSize: 11 }}></i>{m.sender_name || t("agent")}</>}
                                      </div>
                                    )}
                                    <span style={{ fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.35 }}>
                                      {m.content}
                                    </span>
                                    <span className="msg-time">
                                      {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </React.Fragment>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  {selectedConv.blocked ? (
                    <div className="px-3 py-2 d-flex align-items-center justify-content-center gap-2" style={{ borderTop: "1px solid #eff2f7", background: "#fff" }}>
                      <i className="ri-forbid-line" style={{ color: "#212529", fontSize: 16 }}></i>
                      <small style={{ color: "#495057", fontWeight: 500 }}>{t("client_blocked")}</small>
                      <span style={{ color: "#ced4da" }}>|</span>
                      <button className="btn btn-link btn-sm p-0 text-decoration-none" style={{ fontWeight: 600, fontSize: 12.5, color: "#45CB85" }} onClick={handleUnblock} disabled={blocking}>
                        {blocking ? <Spinner size="sm" /> : t("unblock")}
                      </button>
                    </div>
                  ) : selectedConv.status === "handoff" ? (
                    <div className="px-3 px-lg-4 py-2 d-flex gap-2 align-items-end" style={{ borderTop: "1px solid #eff2f7", background: "#fff" }}>
                      <div className="flex-shrink-0 d-flex flex-column gap-1">
                        <button
                          className="btn btn-sm"
                          onClick={handleClose}
                          disabled={closing}
                          style={{ borderRadius: 16, fontSize: 11, fontWeight: 600, padding: "4px 12px", border: "1.5px solid #f06548", color: "#f06548", background: "transparent", whiteSpace: "nowrap" }}
                        >
                          {closing ? <Spinner size="sm" color="danger" /> : t("finish")}
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={handleBlock}
                          disabled={blocking}
                          style={{ borderRadius: 16, fontSize: 11, fontWeight: 600, padding: "4px 12px", background: "#212529", color: "#fff", border: "none", whiteSpace: "nowrap" }}
                        >
                          {blocking ? <Spinner size="sm" color="light" /> : t("block")}
                        </button>
                      </div>
                      <Input
                        type="textarea"
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder={t("write_message")}
                        rows={1}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        style={{ resize: "none", borderRadius: 10, maxHeight: 100, fontSize: 14, padding: "10px 16px", border: "1px solid #e9ebec", background: "#f8f9fa" }}
                      />
                      <button
                        className="msg-send-btn flex-shrink-0"
                        onClick={handleSend}
                        disabled={sending || !reply.trim()}
                      >
                        {sending ? <Spinner size="sm" color="light" /> : <i className="ri-send-plane-fill" style={{ fontSize: 20 }}></i>}
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2 d-flex align-items-center justify-content-center gap-2" style={{ borderTop: "1px solid #eff2f7", background: "#fff" }}>
                      {getConvStatus(selectedConv) === "pending" ? (
                        <>
                          <i className="ri-alarm-warning-line" style={{ color: "#f1963b", fontSize: 16 }}></i>
                          <small style={{ color: "#495057", fontWeight: 500 }}>{t("client_waiting_advisor")}</small>
                          <span style={{ color: "#ced4da" }}>|</span>
                          <button className="btn btn-link btn-sm p-0 text-decoration-none" style={{ fontWeight: 600, fontSize: 12.5, color: "#3577f1" }} onClick={handleTake} disabled={taking}>
                            {taking ? <Spinner size="sm" /> : t("take_conversation")}
                          </button>
                        </>
                      ) : (
                        <>
                          <i className="ri-robot-line" style={{ color: "#3577f1", fontSize: 16 }}></i>
                          <small style={{ color: "#495057", fontWeight: 500 }}>{t("bot_attending")}</small>
                          <span style={{ color: "#ced4da" }}>|</span>
                          <button className="btn btn-link btn-sm p-0 text-decoration-none" style={{ fontWeight: 600, fontSize: 12.5, color: "#3577f1" }} onClick={handleTake} disabled={taking}>
                            {taking ? <Spinner size="sm" /> : t("take_conversation")}
                          </button>
                          <span style={{ color: "#ced4da" }}>|</span>
                          <button className="btn btn-link btn-sm p-0 text-decoration-none" style={{ fontWeight: 600, fontSize: 12.5, color: "#212529" }} onClick={handleBlock} disabled={blocking}>
                            {blocking ? <Spinner size="sm" /> : t("block")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-grow-1 d-flex align-items-center justify-content-center msg-empty-state">
                  <div className="text-center" style={{ maxWidth: 380 }}>
                    <div className="mx-auto mb-4" style={{
                      width: 110, height: 110, borderRadius: "50%",
                      background: "linear-gradient(135deg, #3577f1 0%, #2463d8 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 12px 40px rgba(53,119,241,.15)",
                    }}>
                      <i className="ri-message-3-line" style={{ fontSize: 50, color: "#fff" }}></i>
                    </div>
                    <h4 className="fw-bold mb-2" style={{ color: "#212529" }}>{t("messages")}</h4>
                    <p className="mb-3" style={{ fontSize: 14, lineHeight: 1.6, color: "#878a99" }}>
                      {t("select_conversation_hint")}
                    </p>
                    <div style={{ display: "inline-flex", gap: 20, padding: "12px 24px", background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.04)", border: "1px solid #eff2f7" }}>
                      <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#3577f1" }}>{conversations.length}</div>
                        <div style={{ fontSize: 11, color: "#878a99", fontWeight: 500 }}>Chats</div>
                      </div>
                      <div style={{ width: 1, background: "#eff2f7" }}></div>
                      <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: pendingCount > 0 ? "#f1963b" : "#adb5bd" }}>{pendingCount}</div>
                        <div style={{ fontSize: 11, color: "#878a99", fontWeight: 500 }}>{t("waiting")}</div>
                      </div>
                      <div style={{ width: 1, background: "#eff2f7" }}></div>
                      <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: handoffCount > 0 ? "#f06548" : "#adb5bd" }}>{handoffCount}</div>
                        <div style={{ fontSize: 11, color: "#878a99", fontWeight: 500 }}>{t("live")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default MessagesPage;
